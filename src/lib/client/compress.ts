'use client'

import {
  ACCEPTED_MIME_TYPES,
  COMPRESSION,
  HEIC_MIME_TYPES,
  MAX_ORIGINAL_FILE_BYTES,
} from '@/lib/constants'
import { messages } from '@/lib/messages'

export type PrepareResult =
  | { ok: true; file: File }
  | { ok: false; reason: string }

const ACCEPTED = new Set<string>(ACCEPTED_MIME_TYPES)
const HEIC = new Set<string>(HEIC_MIME_TYPES)

function extensionOf(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.slice(idx).toLowerCase()
}

/**
 * Safari bazen HEIC dosyaları için boş bir MIME tipi verir; bu yüzden
 * uzantıya da bakıyoruz.
 */
function isHeic(file: File): boolean {
  if (HEIC.has(file.type.toLowerCase())) return true
  if (file.type === '' || file.type === 'application/octet-stream') {
    return ['.heic', '.heif'].includes(extensionOf(file.name))
  }
  return false
}

function isAccepted(file: File): boolean {
  if (ACCEPTED.has(file.type.toLowerCase())) return true
  if (file.type === '' || file.type === 'application/octet-stream') {
    return ['.jpg', '.jpeg', '.png', '.webp'].includes(extensionOf(file.name))
  }
  return false
}

function withJpegName(name: string): string {
  return name.replace(/\.[^.]+$/, '') + '.jpg'
}

/** HEIC/HEIF dosyasını tarayıcıda JPEG'e çevirir. Başarısız olursa null döner. */
async function convertHeic(file: File): Promise<File | null> {
  try {
    const { default: heic2any } = await import('heic2any')
    const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
    const blob = Array.isArray(converted) ? converted[0] : converted
    if (!blob) return null
    return new File([blob], withJpegName(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } catch {
    // Bazı HEIC türevleri (ör. HEIC sequence) tarayıcıda çözülemez.
    return null
  }
}

/**
 * Tek bir dosyayı yüklemeye hazırlar:
 *  1. Boyut ve tür doğrulaması
 *  2. Gerekirse HEIC -> JPEG dönüşümü
 *  3. Uzun kenarı 2000px'e indirerek yeniden kodlama
 *
 * EXIF yönü: browser-image-compression görüntüyü canvas'a çizerken EXIF
 * orientation değerini uygular, sonuç dosyada yön "pişmiş" olur. Bu yüzden
 * EXIF verisini taşımıyoruz — aksi hâlde bazı görüntüleyiciler ikinci kez
 * döndürürdü.
 */
export async function prepareFile(input: File): Promise<PrepareResult> {
  if (input.size > MAX_ORIGINAL_FILE_BYTES) {
    return { ok: false, reason: messages.errors.tooLarge }
  }
  if (input.size === 0) {
    return { ok: false, reason: messages.errors.unsupportedFormat }
  }

  let file = input

  if (isHeic(file)) {
    const converted = await convertHeic(file)
    if (!converted) return { ok: false, reason: messages.errors.heicUnsupported }
    file = converted
  } else if (!isAccepted(file)) {
    return { ok: false, reason: messages.errors.unsupportedFormat }
  }

  // Zaten küçük dosyaları yeniden kodlamak kaliteyi boşuna düşürür.
  if (file.size <= COMPRESSION.skipBelowBytes) {
    return { ok: true, file }
  }

  try {
    const { default: imageCompression } = await import('browser-image-compression')
    const compressed = await imageCompression(file, {
      maxWidthOrHeight: COMPRESSION.maxDimension,
      maxSizeMB: COMPRESSION.targetMaxBytes / (1024 * 1024),
      initialQuality: COMPRESSION.quality,
      useWebWorker: true,
      fileType: 'image/jpeg',
      alwaysKeepResolution: false,
    })

    // Sıkıştırma bazen (ör. çok küçük PNG'lerde) dosyayı büyütebilir.
    const chosen = compressed.size < file.size ? compressed : file
    const finalFile =
      chosen instanceof File
        ? chosen
        : new File([chosen], withJpegName(file.name), { type: 'image/jpeg' })

    return { ok: true, file: finalFile }
  } catch {
    return { ok: false, reason: messages.errors.compressionFailed }
  }
}
