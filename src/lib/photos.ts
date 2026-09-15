import 'server-only'
import { prisma } from './prisma'
import { deleteResources, downloadUrl, previewUrl } from './cloudinary'
import { log } from './logger'

export interface DeleteOutcome {
  requested: number
  deleted: number
  failed: number
  /** Artık var olmayan fotoğraflar (silinen + zaten silinmiş olanlar). */
  deletedIds: string[]
  /** Cloudinary'den silinemediği için veritabanında korunanlar. */
  failedIds: string[]
}

/**
 * Fotoğrafları önce Cloudinary'den, sonra veritabanından siler.
 *
 * Sıra bilinçli: Cloudinary silme başarısız olursa veritabanı kaydı korunur,
 * böylece dosya kaybolmaz ve işlem daha sonra tekrar denenebilir.
 *
 * İdempotent: Cloudinary "not_found" derse ya da kayıt veritabanında hiç
 * yoksa (çift tıklama, iki sekmeden silme) fotoğraf silinmiş sayılır ve
 * hata üretilmez.
 */
export async function deletePhotos(eventId: string, photoIds: string[]): Promise<DeleteOutcome> {
  const requested = photoIds.length
  if (requested === 0) {
    return { requested: 0, deleted: 0, failed: 0, deletedIds: [], failedIds: [] }
  }

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, eventId },
    select: { id: true, publicId: true },
  })

  const foundIds = new Set(photos.map((p) => p.id))
  const alreadyGone = photoIds.filter((id) => !foundIds.has(id))

  if (photos.length === 0) {
    return {
      requested,
      deleted: alreadyGone.length,
      failed: 0,
      deletedIds: alreadyGone,
      failedIds: [],
    }
  }

  const { deleted, missing } = await deleteResources(photos.map((p) => p.publicId))
  const removable = new Set([...deleted, ...missing])

  const removedIds = photos.filter((p) => removable.has(p.publicId)).map((p) => p.id)
  const failedIds = photos.filter((p) => !removable.has(p.publicId)).map((p) => p.id)

  if (removedIds.length > 0) {
    await prisma.photo.deleteMany({ where: { id: { in: removedIds }, eventId } })
  }

  if (failedIds.length > 0) {
    log.error('photos', 'Cloudinary silme başarısız, kayıtlar korundu', {
      eventId,
      failedCount: failedIds.length,
    })
  }

  const deletedIds = [...removedIds, ...alreadyGone]
  return {
    requested,
    deleted: deletedIds.length,
    failed: failedIds.length,
    deletedIds,
    failedIds,
  }
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

/*
  Sayfalama imleci: son öğenin "tarih_kimlik" değeri.

  Prisma'nın yerleşik imleci kayıt kimliğine bağlıdır; o kayıt silinirse
  sonraki sayfa boş döner ve galeri bitmiş gibi görünürdü. Değer tabanlı
  (keyset) imleç, imleç fotoğrafı silinse bile doğru yerden devam eder.
*/
function encodeCursor(row: { createdAt: Date; id: string }): string {
  return `${row.createdAt.toISOString()}_${row.id}`
}

function decodeCursor(cursor: string | null): { createdAt: Date; id: string } | null {
  if (!cursor) return null
  const separator = cursor.indexOf('_')
  if (separator <= 0) return null
  const createdAt = new Date(cursor.slice(0, separator))
  const id = cursor.slice(separator + 1)
  if (Number.isNaN(createdAt.getTime()) || id.length === 0) return null
  return { createdAt, id }
}

/**
 * Sayfa sayfa fotoğraf listesi. Binlerce fotoğraf tek seferde asla çekilmez;
 * galeri sonsuz kaydırma ile yükler.
 */
export async function listPhotos(
  eventId: string,
  cursor: string | null,
  limit: number,
): Promise<PhotoPage> {
  const after = decodeCursor(cursor)

  const rows = await prisma.photo.findMany({
    where: {
      eventId,
      ...(after
        ? {
            OR: [
              { createdAt: { lt: after.createdAt } },
              { createdAt: after.createdAt, id: { lt: after.id } },
            ],
          }
        : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
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
  const last = page[page.length - 1]

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
    nextCursor: hasMore && last ? encodeCursor(last) : null,
  }
}

/** Etkinlikteki tüm fotoğrafların kimlikleri ("Tümünü Seç" için). */
export async function listPhotoIds(eventId: string): Promise<string[]> {
  const rows = await prisma.photo.findMany({
    where: { eventId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: { id: true },
  })
  return rows.map((row) => row.id)
}
