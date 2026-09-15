import { makeZip } from 'client-zip'

/**
 * Tüm fotoğrafları yöneticinin tarayıcısında TEK bir ZIP olarak üretir.
 *
 * Neden Cloudinary arşivi değil: ücretsiz planda anında üretilen arşivler
 * ~100 MB'da kesiliyor ve kalan fotoğrafları hata vermeden dışarıda bırakıyor.
 *
 * Nasıl: fotoğraflar Cloudinary'den sırayla çekilir ve oluşan ZIP akış hâlinde
 * yazılır. Bellekte aynı anda yalnızca birkaç fotoğraf bulunur; ZIP boyutu
 * sınırsızdır (client-zip 4 GB üstü için ZIP64 kullanır).
 */

export interface ZipFileEntry {
  url: string
  name: string
  size: number
  lastModified: string
}

export interface ZipProgress {
  done: number
  failed: number
  bytes: number
}

export interface ZipReport {
  /** Tekrar denemelere rağmen indirilemeyen dosyaların adları. */
  failed: string[]
}

/** Aynı anda önden çekilen fotoğraf sayısı; ZIP'e yine sırayla yazılır. */
const LOOKAHEAD = 4
/** Bir fotoğraf için toplam deneme sayısı. */
const MAX_ATTEMPTS = 4

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

/**
 * Tek bir fotoğrafı geçici ağ hatalarına karşı tekrar deneyerek indirir.
 * Asla hata fırlatmaz: başaramazsa null döner ki önden başlatılmış istekler
 * yakalanmamış hataya dönüşmesin.
 */
async function fetchWithRetry(entry: ZipFileEntry, signal?: AbortSignal): Promise<Blob | null> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) return null
    try {
      const response = await fetch(entry.url, { signal })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      // Yarıda kesilen yanıtlarda blob() hata fırlatır; eksik dosya yazılmaz.
      return await response.blob()
    } catch {
      if (signal?.aborted) return null
      await sleep(1000 * 2 ** attempt, signal)
    }
  }
  return null
}

async function* zipInputs(
  entries: ZipFileEntry[],
  report: ZipReport,
  onProgress: (progress: ZipProgress) => void,
  signal?: AbortSignal,
) {
  const pending: Array<{ entry: ZipFileEntry; blob: Promise<Blob | null> }> = []
  let next = 0
  const progress: ZipProgress = { done: 0, failed: 0, bytes: 0 }

  const fill = () => {
    while (pending.length < LOOKAHEAD && next < entries.length) {
      const entry = entries[next++]
      if (entry) pending.push({ entry, blob: fetchWithRetry(entry, signal) })
    }
  }

  fill()
  while (pending.length > 0) {
    const item = pending.shift()
    if (!item) break
    const blob = await item.blob
    if (signal?.aborted) return
    fill()

    if (blob) {
      yield { name: item.entry.name, lastModified: new Date(item.entry.lastModified), input: blob }
      progress.done++
      progress.bytes += blob.size
    } else {
      report.failed.push(item.entry.name)
      progress.failed++
    }
    onProgress({ ...progress })
  }

  // Eksik kalan varsa ZIP'in içine not bırak: kullanıcı neyin gelmediğini bilsin.
  if (report.failed.length > 0) {
    yield {
      name: 'EKSIK_FOTOGRAFLAR.txt',
      lastModified: new Date(),
      input: `Asagidaki ${report.failed.length} fotograf tekrar denemelere ragmen indirilemedi:\r\n\r\n${report.failed.join('\r\n')}\r\n`,
    }
  }
}

/**
 * ZIP akışını hedefe yazar. Hedef, Chrome/Edge'de doğrudan diskteki dosya;
 * diğer tarayıcılarda bellekte biriktirilen bir Blob olabilir.
 */
export async function writePhotoZip(
  entries: ZipFileEntry[],
  target: WritableStream<Uint8Array>,
  options: { onProgress: (progress: ZipProgress) => void; signal?: AbortSignal },
): Promise<ZipReport> {
  const report: ZipReport = { failed: [] }
  const stream = makeZip(zipInputs(entries, report, options.onProgress, options.signal))
  await stream.pipeTo(target, { signal: options.signal })
  return report
}
