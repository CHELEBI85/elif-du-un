'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, ImagePlus, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FILE_INPUT_ACCEPT, MAX_PHOTOS_PER_BATCH, UPLOAD_CONCURRENCY } from '@/lib/constants'
import { messages } from '@/lib/messages'
import { validateSelection } from '@/lib/client/compress'
import { getUploaderSessionId } from '@/lib/client/session'
import { runUploads } from '@/lib/client/upload'
import { SelectedPhotoGrid } from './selected-photo-grid'
import { UploadProgress } from './upload-progress'
import { UploadSuccess } from './upload-success'
import type { RejectedPhoto, SelectedPhoto } from './types'

type Phase = 'idle' | 'review' | 'uploading' | 'success'

interface UploadExperienceProps {
  slug: string
  coupleName: string
}

/** İlerleme çubuklarının en sık güncellenme aralığı. */
const PROGRESS_FLUSH_MS = 250
/** Reddedilen dosyalar listesinde gösterilecek en fazla satır. */
const MAX_REJECTED_SHOWN = 8

function makeId(): string {
  return Math.random().toString(36).slice(2, 11) + Date.now().toString(36)
}

/** Aynı dosyanın ikinci kez eklenmesini yakalamak için anahtar. */
function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

/**
 * Yükleme sürerken ekranın kapanmasını engeller. Telefon kilitlenirse
 * tarayıcı açık bağlantıları askıya alır; 300 fotoğraflık yüklemede bu çok
 * olası. Desteklenmiyorsa sessizce devam edilir.
 */
async function acquireWakeLock(): Promise<WakeLockSentinel | null> {
  try {
    if ('wakeLock' in navigator) return await navigator.wakeLock.request('screen')
  } catch {
    // Düşük pil modu vb. — kritik değil.
  }
  return null
}

export function UploadExperience({ slug, coupleName }: UploadExperienceProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [photos, setPhotos] = useState<SelectedPhoto[]>([])
  const [rejected, setRejected] = useState<RejectedPhoto[]>([])
  const [banner, setBanner] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [uploadedTotal, setUploadedTotal] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)

  /*
    İlerleme olayları saniyede onlarca kez gelir. Her birinde 300 öğelik
    listeyi yeniden oluşturmak telefonu kasar; bu yüzden değerler burada
    biriktirilip en fazla 250 ms'de bir state'e yazılır.
  */
  const progressBuffer = useRef(new Map<string, number>())
  const flushTimer = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (flushTimer.current !== null) window.clearTimeout(flushTimer.current)
    }
  }, [])

  const scheduleProgressFlush = useCallback(() => {
    if (flushTimer.current !== null) return
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null
      // Updater saf kalsın diye tampon önce kopyalanıp temizleniyor.
      const snapshot = new Map(progressBuffer.current)
      progressBuffer.current.clear()
      setPhotos((prev) =>
        prev.map((p) => {
          const value = snapshot.get(p.id)
          return value !== undefined && p.status === 'uploading' ? { ...p, progress: value } : p
        }),
      )
    }, PROGRESS_FLUSH_MS)
  }, [])

  const openPicker = useCallback(() => {
    setBanner(null)
    setNotice(null)
    inputRef.current?.click()
  }, [])

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0) return

      // Seçim anında yalnızca hızlı doğrulama; sıkıştırma yüklerken yapılır.
      const existingKeys = new Set(photos.map((p) => p.key))
      const available = MAX_PHOTOS_PER_BATCH - photos.length
      const added: SelectedPhoto[] = []
      const failed: RejectedPhoto[] = []
      let duplicates = 0
      let overflow = 0

      for (const file of Array.from(fileList)) {
        const key = fileKey(file)
        if (existingKeys.has(key)) {
          duplicates++
          continue
        }
        const reason = validateSelection(file)
        if (reason) {
          failed.push({ name: file.name, reason })
          continue
        }
        if (added.length >= available) {
          overflow++
          continue
        }
        existingKeys.add(key)
        added.push({
          id: makeId(),
          file,
          key,
          name: file.name,
          status: 'ready',
          progress: 0,
        })
      }

      setPhotos((prev) => [...prev, ...added])
      setRejected(failed)
      setBanner(overflow > 0 ? messages.errors.batchLimit(MAX_PHOTOS_PER_BATCH) : null)
      setNotice(duplicates > 0 ? messages.upload.duplicatesSkipped(duplicates) : null)
      if (added.length > 0 || photos.length > 0) setPhase('review')
    },
    [photos],
  )

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const send = useCallback(
    async (onlyFailed: boolean) => {
      const queue = photos.filter((p) => (onlyFailed ? p.status === 'error' : p.status !== 'done'))
      if (queue.length === 0) return

      setBanner(null)
      setNotice(null)
      setPhase('uploading')
      const queueIds = new Set(queue.map((p) => p.id))
      setPhotos((prev) =>
        prev.map((p) =>
          queueIds.has(p.id) ? { ...p, status: 'queued', progress: 0, error: undefined } : p,
        ),
      )

      // Bu turdan önce zaten yüklenmiş olanlar (kısmi başarı sonrası tekrar denemede).
      const alreadyDone = photos.filter((p) => p.status === 'done').length
      const wakeLock = await acquireWakeLock()

      const { outcomes, fatalError } = await runUploads(
        queue.map((p) => ({ id: p.id, file: p.file })),
        {
          slug,
          sessionId: getUploaderSessionId(),
          concurrency: UPLOAD_CONCURRENCY,
          onStart: (id) =>
            setPhotos((prev) =>
              prev.map((p) => (p.id === id ? { ...p, status: 'uploading', progress: 0 } : p)),
            ),
          onProgress: (id, percent) => {
            progressBuffer.current.set(id, percent)
            scheduleProgressFlush()
          },
          onSettled: (outcome) => {
            progressBuffer.current.delete(outcome.id)
            setPhotos((prev) =>
              prev.map((p) =>
                p.id === outcome.id
                  ? outcome.ok
                    ? { ...p, status: 'done', progress: 100, error: undefined }
                    : { ...p, status: 'error', error: outcome.error }
                  : p,
              ),
            )
          },
        },
      )

      await wakeLock?.release().catch(() => undefined)

      /*
        Sonuç state'ten değil runUploads'un döndürdüğü listeden hesaplanıyor;
        böylece sayaç updater'ın kaç kez çalıştığından bağımsız.
      */
      const failedCount = outcomes.filter((o) => !o.ok).length

      if (failedCount === 0) {
        setPhotos([])
        setRejected([])
        setUploadedTotal((n) => n + alreadyDone + outcomes.length)
        setPhase('success')
      } else {
        if (fatalError) setBanner(fatalError)
        setPhase('review')
      }
    },
    [photos, scheduleProgressFlush, slug],
  )

  const startOver = useCallback(() => {
    setPhotos([])
    setRejected([])
    setBanner(null)
    setNotice(null)
    setPhase('idle')
  }, [])

  // Son fotoğraf da kaldırıldıysa başlangıç ekranına dönülür.
  const view: Phase = phase === 'review' && photos.length === 0 ? 'idle' : phase

  const pendingCount = photos.filter((p) => p.status !== 'done').length
  const failedCount = photos.filter((p) => p.status === 'error').length
  const doneCount = photos.filter((p) => p.status === 'done').length

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
          handleFiles(event.target.files)
          // Aynı dosyanın tekrar seçilebilmesi için input sıfırlanır.
          event.target.value = ''
        }}
      />

      {view === 'success' ? (
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

          {notice ? (
            <p role="status" className="rounded-md bg-sand px-4 py-3 text-sm leading-relaxed text-ink-soft">
              {notice}
            </p>
          ) : null}

          {view === 'idle' ? (
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

          {view === 'uploading' ? <UploadProgress photos={photos} /> : null}

          {view === 'review' ? (
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
                <Button variant="ghost" size="md" onClick={startOver}>
                  Seçimi temizle
                </Button>
              </div>
            </div>
          ) : null}

          {rejected.length > 0 ? (
            <ul className="flex flex-col gap-1.5 rounded-md border border-line bg-cream px-4 py-3">
              {rejected.slice(0, MAX_REJECTED_SHOWN).map((item, index) => (
                <li key={`${item.name}-${index}`} className="text-xs leading-relaxed text-muted">
                  <span className="font-medium text-ink-soft">{item.name}</span> — {item.reason}
                </li>
              ))}
              {rejected.length > MAX_REJECTED_SHOWN ? (
                <li className="text-xs text-muted">
                  ve {rejected.length - MAX_REJECTED_SHOWN} dosya daha eklenemedi.
                </li>
              ) : null}
            </ul>
          ) : null}
        </div>
      )}
    </div>
  )
}
