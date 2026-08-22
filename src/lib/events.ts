import 'server-only'
import type { Event } from '@prisma/client'
import { prisma } from './prisma'
import { DEFAULT_RETENTION_DAYS } from './constants'

/** Bir etkinliğin yükleme açısından hesaplanmış durumu. */
export interface EventUploadState {
  /** Yeni fotoğraf kabul ediliyor mu? */
  canUpload: boolean
  /** Saklama süresi dolmuş mu? */
  isExpired: boolean
  /** Admin yüklemeyi elle kapatmış mı? */
  manuallyDisabled: boolean
}

export function resolveUploadState(event: Pick<Event, 'status' | 'expiresAt' | 'uploadEnabled'>): EventUploadState {
  const isExpired =
    event.status === 'EXPIRED' ||
    event.status === 'ARCHIVED' ||
    (event.expiresAt !== null && event.expiresAt.getTime() <= Date.now())
  const manuallyDisabled = !event.uploadEnabled
  return { canUpload: !isExpired && !manuallyDisabled, isExpired, manuallyDisabled }
}

/**
 * expiresAt = (etkinlik tarihi ?? oluşturulma tarihi) + saklama süresi.
 * Etkinlik tarihi girilmemişse oluşturulma tarihinden sayılır; böylece
 * tarih bilinmeden de saklama süresi işler.
 */
export function computeExpiresAt(
  eventDate: Date | null,
  retentionDays: number,
  createdAt: Date = new Date(),
): Date {
  const base = eventDate ?? createdAt
  const start = new Date(base)
  // Gün sonuna kadar sayalım ki düğün günü boyunca yükleme açık kalsın.
  start.setHours(23, 59, 59, 999)
  return new Date(start.getTime() + retentionDays * 86_400_000)
}

export function defaultRetentionDays(): number {
  return DEFAULT_RETENTION_DAYS
}

/** Herkese açık sayfa için etkinliği slug ile getirir. */
export async function getEventBySlug(slug: string) {
  return prisma.event.findUnique({ where: { slug } })
}

/** Etkinliğin fotoğraf sayısı ve tahmini depolama kullanımı. */
export async function getEventStats(eventId: string) {
  const [aggregate, event] = await Promise.all([
    prisma.photo.aggregate({
      where: { eventId },
      _count: { _all: true },
      _sum: { fileSize: true },
    }),
    prisma.event.findUnique({ where: { id: eventId } }),
  ])

  const photoCount = aggregate._count._all
  const storageBytes = aggregate._sum.fileSize ?? 0
  return {
    photoCount,
    storageBytes,
    averageBytes: photoCount > 0 ? Math.round(storageBytes / photoCount) : 0,
    expiresAt: event?.expiresAt ?? null,
    status: event?.status ?? 'ACTIVE',
  }
}

/** Bir misafir oturumunun bu etkinlikte kaç fotoğrafı olduğunu döndürür. */
export async function countSessionPhotos(eventId: string, sessionId: string): Promise<number> {
  return prisma.photo.count({ where: { eventId, uploaderSessionId: sessionId } })
}
