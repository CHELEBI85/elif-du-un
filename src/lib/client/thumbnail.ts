'use client'

/**
 * Seçilen fotoğraflar için küçük (240px) önizleme üretir.
 *
 * Neden tam boyut değil: 12 MP bir telefon fotoğrafı çözüldüğünde ~48 MB
 * bellek kaplar. 300 fotoğrafın ızgarasını orijinallerden göstermek iPhone
 * Safari'de sekmeyi çökertir. Burada her fotoğraf bir kez çözülüp küçük bir
 * JPEG'e indirgenir; ızgara yalnızca bu birkaç KB'lık görselleri tutar.
 *
 * İşler tek sıra hâlinde yürür (aynı anda tek çözümleme) ki bellek tepe
 * noktası bir fotoğrafla sınırlı kalsın.
 */

const THUMB_SIZE = 240

type Task = () => Promise<void>
const queue: Task[] = []
let running = false

async function drain(): Promise<void> {
  if (running) return
  running = true
  while (queue.length > 0) {
    const task = queue.shift()
    if (task) await task()
  }
  running = false
}

/** Görüntüyü kaynak olarak çözer; mümkünse doğrudan küçültülmüş hâlde. */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === 'function') {
    try {
      // Destekleyen tarayıcılar çözümlemeyi doğrudan küçük boyutta yapar.
      const bitmap = await createImageBitmap(file, {
        resizeWidth: THUMB_SIZE * 2,
        resizeQuality: 'medium',
        imageOrientation: 'from-image',
      })
      return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() }
    } catch {
      // Seçenekleri desteklemeyen tarayıcılar için aşağıdaki yola düş.
    }
  }

  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    img.src = url
    await img.decode()
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      close: () => URL.revokeObjectURL(url),
    }
  } catch (error) {
    URL.revokeObjectURL(url)
    throw error
  }
}

async function render(file: File): Promise<string | null> {
  try {
    const { source, width, height, close } = await decode(file)
    try {
      if (!width || !height) return null
      // Kareye ortalanmış kırpma — ızgara karoları kare.
      const side = Math.min(width, height)
      const sx = (width - side) / 2
      const sy = (height - side) / 2

      const canvas = document.createElement('canvas')
      canvas.width = THUMB_SIZE
      canvas.height = THUMB_SIZE
      const ctx = canvas.getContext('2d')
      if (!ctx) return null
      ctx.drawImage(source, sx, sy, side, side, 0, 0, THUMB_SIZE, THUMB_SIZE)

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/jpeg', 0.72),
      )
      return blob ? URL.createObjectURL(blob) : null
    } finally {
      close()
    }
  } catch {
    // Ör. Chrome'da HEIC çözülemez; karo yer tutucu gösterir.
    return null
  }
}

/**
 * Önizleme ister. Dönen fonksiyon çağrılırsa (karo ekrandan kaldırıldı)
 * henüz başlamamış iş kuyruktan çıkarılır.
 */
export function requestThumbnail(file: File, onReady: (url: string | null) => void): () => void {
  let cancelled = false
  const task: Task = async () => {
    if (cancelled) return
    const url = await render(file)
    if (cancelled) {
      if (url) URL.revokeObjectURL(url)
      return
    }
    onReady(url)
  }
  queue.push(task)
  void drain()

  return () => {
    cancelled = true
    const index = queue.indexOf(task)
    if (index !== -1) queue.splice(index, 1)
  }
}
