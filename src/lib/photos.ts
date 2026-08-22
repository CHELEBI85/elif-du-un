import 'server-only'
import { prisma } from './prisma'
import { deleteResources, downloadUrl, previewUrl } from './cloudinary'
import { log } from './logger'

export interface DeleteOutcome {
  requested: number
  deleted: number
  failed: number
}

/**
 * Fotoğrafları önce Cloudinary'den, sonra veritabanından siler.
 *
 * Sıra bilinçli: Cloudinary silme başarısız olursa veritabanı kaydı korunur,
 * böylece dosya kaybolmaz ve işlem daha sonra tekrar denenebilir. Cloudinary
 * "not_found" derse (zaten silinmiş) bu başarı sayılır — işlem idempotenttir.
 */
export async function deletePhotos(eventId: string, photoIds: string[]): Promise<DeleteOutcome> {
  if (photoIds.length === 0) return { requested: 0, deleted: 0, failed: 0 }

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, eventId },
    select: { id: true, publicId: true },
  })

  if (photos.length === 0) return { requested: photoIds.length, deleted: 0, failed: 0 }

  const { deleted, missing, failed } = await deleteResources(photos.map((p) => p.publicId))
  const removable = new Set([...deleted, ...missing])

  const idsToRemove = photos.filter((p) => removable.has(p.publicId)).map((p) => p.id)

  if (idsToRemove.length > 0) {
    await prisma.photo.deleteMany({ where: { id: { in: idsToRemove }, eventId } })
  }

  if (failed.length > 0) {
    log.error('photos', 'Cloudinary silme başarısız, kayıtlar korundu', {
      eventId,
      failedCount: failed.length,
    })
  }

  return { requested: photoIds.length, deleted: idsToRemove.length, failed: failed.length }
}

export interface GalleryPhoto {
  id: string
  thumbnailUrl: string
  /** Lightbox için orta boy sürüm — orijinal dosya asla tarayıcıya inmez. */
  previewUrl: string
  /** Tarayıcıyı indirmeye zorlayan adres. */
  downloadUrl: string
  width: number
  height: number
  fileSize: number
  format: string
  originalFilename: string | null
  createdAt: string
}

export interface PhotoPage {
  items: GalleryPhoto[]
  nextCursor: string | null
}

/**
 * İmleç tabanlı sayfalama. Binlerce fotoğraf tek seferde asla çekilmez;
 * galeri sonsuz kaydırma ile sayfa sayfa yükler.
 */
export async function listPhotos(
  eventId: string,
  cursor: string | null,
  limit: number,
): Promise<PhotoPage> {
  const rows = await prisma.photo.findMany({
    where: { eventId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      publicId: true,
      thumbnailUrl: true,
      width: true,
      height: true,
      fileSize: true,
      format: true,
      originalFilename: true,
      createdAt: true,
    },
  })

  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  return {
    items: page.map((row) => ({
      id: row.id,
      thumbnailUrl: row.thumbnailUrl,
      previewUrl: previewUrl(row.publicId),
      downloadUrl: downloadUrl(row.publicId, row.format, row.originalFilename ?? undefined),
      width: row.width,
      height: row.height,
      fileSize: row.fileSize,
      format: row.format,
      originalFilename: row.originalFilename,
      createdAt: row.createdAt.toISOString(),
    })),
    nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
  }
}
