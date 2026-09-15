'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Check, Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatBytes } from '@/lib/format'
import { messages } from '@/lib/messages'
import type { ZipFileEntry, ZipProgress } from '@/lib/client/zip-download'

interface SaveFileHandle {
  createWritable: () => Promise<WritableStream<Uint8Array>>
}

/** File System Access API — TypeScript'in dom kütüphanesinde henüz yok. */
type WindowWithSavePicker = Window & {
  showSaveFilePicker?: (options: {
    suggestedName: string
    types: Array<{ description: string; accept: Record<string, string[]> }>
  }) => Promise<SaveFileHandle>
}

type Phase = 'idle' | 'running' | 'done' | 'cancelled' | 'error'

/** Bellekte biriken parçalar bu boyuta ulaşınca Blob'a aktarılır. */
const BLOB_FLUSH_BYTES = 16 * 1024 * 1024

/**
 * Kaydetme penceresini desteklemeyen tarayıcılar için hedef: ZIP'i parça
 * parça Blob'lara toplar. Uint8Array'leri tek dizide tutmak 1 GB'lık ZIP'te
 * JS belleğini doldururdu; Blob'lar ise tarayıcı tarafından diske taşınabilir.
 */
function createBlobTarget() {
  const blobs: Blob[] = []
  let buffer: Uint8Array[] = []
  let buffered = 0

  const flush = () => {
    if (buffer.length === 0) return
    blobs.push(new Blob(buffer as BlobPart[]))
    buffer = []
    buffered = 0
  }

  const stream = new WritableStream<Uint8Array>({
    write(chunk) {
      buffer.push(chunk)
      buffered += chunk.byteLength
      if (buffered >= BLOB_FLUSH_BYTES) flush()
    },
    close() {
      flush()
    },
  })

  return { stream, result: () => new Blob(blobs, { type: 'application/zip' }) }
}

function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // İndirme başladıktan sonra serbest bırak.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function DownloadAllButton({
  eventId,
  photoCount,
  fileName,
}: {
  eventId: string
  photoCount: number
  /** Önerilen ZIP adı, ör. "elif-aydin-yunus-emre-kapukaya-fotograflar.zip". */
  fileName: string
}) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState<ZipProgress>({ done: 0, failed: 0, bytes: 0 })
  const [total, setTotal] = useState({ files: photoCount, bytes: 0 })
  const [failedNames, setFailedNames] = useState<string[]>([])
  const [directToDisk, setDirectToDisk] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // İndirme sürerken sekme kapatılırsa ZIP yarım kalır: uyar.
  useEffect(() => {
    if (phase !== 'running') return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [phase])

  const start = async () => {
    setError(null)
    setFailedNames([])
    setProgress({ done: 0, failed: 0, bytes: 0 })

    /*
      1) Kaydetme penceresi TIKLAMANIN HEMEN İÇİNDE açılmalı: önce ağ isteği
      beklenirse tarayıcı kullanıcı etkileşimini kaybedip pencereyi engeller.
    */
    const picker = (window as WindowWithSavePicker).showSaveFilePicker
    let diskTarget: WritableStream<Uint8Array> | null = null
    if (picker) {
      try {
        const handle = await picker({
          suggestedName: fileName,
          types: [{ description: 'ZIP arşivi', accept: { 'application/zip': ['.zip'] } }],
        })
        diskTarget = await handle.createWritable()
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return // kullanıcı vazgeçti
        diskTarget = null // pencere açılamadı: bellek yoluna düş
      }
    }
    setDirectToDisk(diskTarget !== null)

    const controller = new AbortController()
    abortRef.current = controller
    setPhase('running')

    const blobTarget = diskTarget ? null : createBlobTarget()
    const target = diskTarget ?? blobTarget?.stream
    if (!target) return

    try {
      // 2) Dosya listesi
      const response = await fetch(`/api/events/${eventId}/download`, { signal: controller.signal })
      if (!response.ok) throw new Error('list')
      const data = (await response.json()) as { files: ZipFileEntry[]; totalBytes: number }
      setTotal({ files: data.files.length, bytes: data.totalBytes })

      // 3) Akış
      const { writePhotoZip } = await import('@/lib/client/zip-download')
      const report = await writePhotoZip(data.files, target, {
        signal: controller.signal,
        onProgress: setProgress,
      })

      if (blobTarget) saveBlob(blobTarget.result(), fileName)
      setFailedNames(report.failed)
      setPhase('done')
    } catch {
      // Yarım dosya kaydedilmesin: Chrome'da abort geçici dosyayı hiç yazmadan atar.
      // pipeTo zaten iptal ettiyse bu çağrı reddedilir; önemsiz.
      await target.abort().catch(() => undefined)
      if (controller.signal.aborted) {
        setPhase('cancelled')
      } else {
        setError(messages.errors.server)
        setPhase('error')
      }
    } finally {
      abortRef.current = null
    }
  }

  const cancel = () => abortRef.current?.abort()

  if (photoCount === 0) {
    return (
      <Button variant="outline" size="md" disabled>
        <Download aria-hidden="true" />
        Tüm Fotoğrafları İndir
      </Button>
    )
  }

  const percent =
    total.files > 0 ? Math.round(((progress.done + progress.failed) / total.files) * 100) : 0

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 sm:w-80">
      {phase !== 'running' ? (
        <Button variant="outline" size="md" onClick={() => void start()}>
          <Download aria-hidden="true" />
          Tüm Fotoğrafları İndir
        </Button>
      ) : null}

      {phase === 'running' ? (
        <div className="rounded-md border border-line bg-ivory p-4" role="status" aria-live="polite">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-ink">Tek ZIP hazırlanıyor</span>
            <span className="tabular-nums text-muted">
              {progress.done + progress.failed} / {total.files}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sand">
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-xs tabular-nums text-muted">
            {formatBytes(progress.bytes)}
            {total.bytes > 0 ? ` / ${formatBytes(total.bytes)}` : ''}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-muted">
            {directToDisk
              ? 'Fotoğraflar seçtiğin dosyaya doğrudan yazılıyor. Bitene kadar bu sekmeyi kapatma.'
              : 'Bu tarayıcı dosyayı doğrudan diske yazamıyor; ZIP bitince indirme başlayacak. Çok fazla fotoğrafta bilgisayarda Chrome veya Edge daha güvenilirdir. Bu sekmeyi kapatma.'}
          </p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={cancel}>
            <X aria-hidden="true" />
            Vazgeç
          </Button>
        </div>
      ) : null}

      {phase === 'done' ? (
        failedNames.length === 0 ? (
          <p role="status" className="flex items-start gap-2 text-sm text-success">
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {progress.done} fotoğraf tek ZIP olarak kaydedildi.
          </p>
        ) : (
          <div role="alert" className="rounded-md bg-danger-wash px-3 py-2 text-sm text-danger">
            <p className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {progress.done} fotoğraf kaydedildi, {failedNames.length} fotoğraf tekrar denemelere
              rağmen indirilemedi. Adları ZIP içindeki EKSIK_FOTOGRAFLAR.txt dosyasında.
            </p>
          </div>
        )
      ) : null}

      {phase === 'cancelled' ? (
        <p role="status" className="text-sm text-muted">
          İndirme durduruldu; yarım kalan dosyayı silebilirsin.
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
