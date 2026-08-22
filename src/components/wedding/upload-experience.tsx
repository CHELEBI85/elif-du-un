'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ImagePlus, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { FILE_INPUT_ACCEPT, MAX_PHOTOS_PER_BATCH, UPLOAD_CONCURRENCY } from '@/lib/constants'
import { messages } from '@/lib/messages'
import { prepareFile } from '@/lib/client/compress'
import { getUploaderSessionId } from '@/lib/client/session'
import { requestTickets, runUploads, UploadError, type UploadJob } from '@/lib/client/upload'
import { SelectedPhotoGrid } from './selected-photo-grid'
import { UploadProgress } from './upload-progress'
import { UploadSuccess } from './upload-success'
import type { RejectedPhoto, SelectedPhoto } from './types'

type Phase = 'idle' | 'preparing' | 'review' | 'uploading' | 'success'

interface UploadExperienceProps {
  slug: string
  coupleName: string
}

/** Hazırlama işini sınırlı tutar; aksi hâlde 20 fotoğrafın çözülmesi arayüzü dondurur. */
const PREPARE_CONCURRENCY = 2

function makeId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

export function UploadExperience({ slug, coupleName }: UploadExperienceProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [photos, setPhotos] = useState<SelectedPhoto[]>([])
  const [rejected, setRejected] = useState<RejectedPhoto[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const [uploadedTotal, setUploadedTotal] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const objectUrls = useRef<Set<string>>(new Set())

  // Bileşen kaldırıldığında tüm önizleme URL'lerini serbest bırak.
  useEffect(() => {
    const urls = objectUrls.current
    return () => {
      for (const url of urls) URL.revokeObjectURL(url)
      urls.clear()
    }
  }, [])

  const releasePhotos = useCallback((items: SelectedPhoto[]) => {
    for (const item of items) {
      URL.revokeObjectURL(item.previewUrl)
      objectUrls.current.delete(item.previewUrl)
    }
  }, [])

  const openPicker = useCallback(() => {
    setBanner(null)
    inputRef.current?.click()
  }, [])

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return

      const incoming = Array.from(fileList)
      const available = MAX_PHOTOS_PER_BATCH - photos.length

      if (available <= 0) {
        setBanner(messages.errors.batchLimit(MAX_PHOTOS_PER_BATCH))
        return
      }

      const accepted = incoming.slice(0, available)
      const overflow = incoming.length - accepted.length

      setPhase('preparing')
      setRejected([])

      const prepared: SelectedPhoto[] = []
      const failed: RejectedPhoto[] = []
      let cursor = 0

      const worker = async () => {
        while (cursor < accepted.length) {
          const file = accepted[cursor++]
          if (!file) return
          const result = await prepareFile(file)
          if (result.ok) {
            const previewUrl = URL.createObjectURL(result.file)
            objectUrls.current.add(previewUrl)
            prepared.push({
              id: makeId(),
              file: result.file,
              previewUrl,
              name: file.name,
              size: result.file.size,
              status: 'ready',
              progress: 0,
            })
          } else {
            // Tek bir desteklenmeyen dosya tüm yüklemeyi durdurmaz.
            failed.push({ name: file.name, reason: result.reason })
          }
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(PREPARE_CONCURRENCY, accepted.length) }, () => worker()),
      )

      setPhotos((prev) => [...prev, ...prepared])
      setRejected(failed)
      if (overflow > 0) setBanner(messages.errors.batchLimit(MAX_PHOTOS_PER_BATCH))
      setPhase(prepared.length > 0 || photos.length > 0 ? 'review' : 'idle')
    },
    [photos.length],
  )

  const removePhoto = useCallback(
    (id: string) => {
      setPhotos((prev) => {
        const target = prev.find((p) => p.id === id)
        if (target) releasePhotos([target])
        const next = prev.filter((p) => p.id !== id)
        if (next.length === 0) setPhase('idle')
        return next
      })
    },
    [releasePhotos],
  )

  const send = useCallback(
    async (onlyFailed: boolean) => {
      const queue = photos.filter((p) => (onlyFailed ? p.status === 'error' : p.status !== 'done'))
      if (queue.length === 0) return

      setBanner(null)
      setPhase('uploading')
      const queueIds = new Set(queue.map((p) => p.id))
      setPhotos((prev) =>
        prev.map((p) =>
          queueIds.has(p.id) ? { ...p, status: 'uploading', progress: 0, error: undefined } : p,
        ),
      )

      const sessionId = getUploaderSessionId()

      let tickets
      try {
        tickets = await requestTickets(slug, sessionId, queue.length)
      } catch (error) {
        const text = error instanceof UploadError ? error.message : messages.errors.server
        setBanner(text)
        setPhotos((prev) =>
          prev.map((p) => (queueIds.has(p.id) ? { ...p, status: 'error', error: text } : p)),
        )
        setPhase('review')
        return
      }

      const jobs: UploadJob[] = []
      queue.forEach((photo, index) => {
        const ticket = tickets[index]
        if (ticket) jobs.push({ id: photo.id, file: photo.file, ticket })
      })

      await runUploads(jobs, {
        slug,
        sessionId,
        concurrency: UPLOAD_CONCURRENCY,
        onProgress: (id, percent) =>
          setPhotos((prev) => prev.map((p) => (p.id === id ? { ...p, progress: percent } : p))),
        onSettled: (outcome) =>
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === outcome.id
                ? outcome.ok
                  ? { ...p, status: 'done', progress: 100, error: undefined }
                  : { ...p, status: 'error', error: outcome.error }
                : p,
            ),
          ),
      })

      // Nihai durumu doğrudan en güncel state üzerinden okuyoruz.
      setPhotos((current) => {
        const succeeded = current.filter((p) => p.status === 'done')
        const stillFailing = current.filter((p) => p.status !== 'done')

        if (stillFailing.length === 0) {
          releasePhotos(current)
          setUploadedTotal((n) => n + succeeded.length)
          setPhase('success')
          return []
        }

        setPhase('review')
        return current
      })
    },
    [photos, releasePhotos, slug],
  )

  const startOver = useCallback(() => {
    setPhotos((prev) => {
      releasePhotos(prev)
      return []
    })
    setRejected([])
    setBanner(null)
    setPhase('idle')
  }, [releasePhotos])

  const pendingCount = photos.filter((p) => p.status !== 'done').length
  const failedCount = photos.filter((p) => p.status === 'error').length
  const doneCount = photos.filter((p) => p.status === 'done').length
  const isBusy = phase === 'preparing' || phase === 'uploading'

  return (
    <div className="w-full">
      <input
        ref={inputRef}
        type="file"
        accept={FILE_INPUT_ACCEPT}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          void handleFiles(event.target.files)
          // Aynı dosyanın tekrar seçilebilmesi için input sıfırlanır.
          event.target.value = ''
        }}
      />

      {phase === 'success' ? (
        <UploadSuccess
          coupleName={coupleName}
          uploadedCount={uploadedTotal}
          onUploadMore={() => {
            setPhase('idle')
            openPicker()
          }}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {banner ? (
            <p
              role="alert"
              className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger-wash px-4 py-3 text-sm leading-relaxed text-danger"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>{banner}</span>
            </p>
          ) : null}

          {phase === 'idle' ? (
            <div className="flex flex-col items-center gap-5">
              <Button variant="primary" size="xl" className="w-full" onClick={openPicker}>
                <ImagePlus aria-hidden="true" />
                {messages.upload.cta}
              </Button>
              <p className="max-w-xs text-center text-xs leading-relaxed text-muted">
                {messages.upload.noAccount}
              </p>
            </div>
          ) : null}

          {phase === 'preparing' ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Spinner className="size-5 text-gold" />
              <p className="font-serif text-lg italic text-muted">{messages.upload.preparing}</p>
            </div>
          ) : null}

          {phase === 'uploading' ? <UploadProgress photos={photos} /> : null}

          {phase === 'review' && photos.length > 0 ? (
            <div className="flex flex-col gap-5">
              <div className="flex items-baseline justify-between gap-3 border-b border-line pb-4">
                <h2 className="font-serif text-2xl font-normal text-ink">
                  {messages.upload.selected(photos.length)}
                </h2>
                {photos.length < MAX_PHOTOS_PER_BATCH ? (
                  <button
                    type="button"
                    onClick={openPicker}
                    className="shrink-0 text-sm font-medium text-gold-deep underline decoration-gold/40 underline-offset-4 transition-colors hover:text-ink hover:decoration-ink"
                  >
                    Ekle
                  </button>
                ) : null}
              </div>

              <SelectedPhotoGrid photos={photos} onRemove={removePhoto} />

              {failedCount > 0 ? (
                <div className="rounded-md border border-line bg-cream px-4 py-3 text-sm leading-relaxed">
                  {doneCount > 0 ? (
                    <p className="text-ink-soft">{doneCount} fotoğraf başarıyla yüklendi.</p>
                  ) : null}
                  <p className="text-danger">{failedCount} fotoğraf yüklenemedi.</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                {failedCount > 0 ? (
                  <Button variant="primary" size="lg" onClick={() => void send(true)}>
                    {messages.upload.retryFailed}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="lg"
                    disabled={pendingCount === 0}
                    onClick={() => void send(false)}
                  >
                    <Send aria-hidden="true" />
                    {messages.upload.send}
                  </Button>
                )}
                <Button variant="ghost" size="md" onClick={startOver} disabled={isBusy}>
                  Seçimi temizle
                </Button>
              </div>
            </div>
          ) : null}

          {rejected.length > 0 ? (
            <ul className="flex flex-col gap-1.5 rounded-md border border-line bg-cream px-4 py-3">
              {rejected.map((item) => (
                <li key={item.name} className="text-xs leading-relaxed text-muted">
                  <span className="font-medium text-ink-soft">{item.name}</span> — {item.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  )
}
