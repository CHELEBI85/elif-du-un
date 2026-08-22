import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { serverEnv } from '@/lib/env'
import { deleteResources } from '@/lib/cloudinary'
import { unauthorized, withErrorHandling } from '@/lib/api'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Vercel Hobby planında fonksiyon süresi sınırlıdır; iş parça parça yapılır.
export const maxDuration = 60

/** Tek çalıştırmada silinecek en fazla fotoğraf. Kalanlar ertesi gün alınır. */
const MAX_PHOTOS_PER_RUN = 600
/** Cloudinary Admin API çağrısı başına en fazla public_id. */
const CLOUDINARY_BATCH = 100

/**
 * Süresi dolmuş etkinliklerin fotoğraflarını temizler.
 *
 * Tasarım kuralları:
 *  - Idempotent: iki kez çalıştırmak hiçbir şeyi bozmaz. Cloudinary'de
 *    bulunamayan kaynak hata değil, "zaten silinmiş" kabul edilir.
 *  - Kapak görselleri `wedding-assets/` altında durur ve bu iş asla oraya
 *    dokunmaz; yalnızca veritabanındaki Photo kayıtları hedeflenir.
 *  - Cloudinary silme başarısız olursa veritabanı kaydı korunur, böylece
 *    bir sonraki çalıştırmada tekrar denenir.
 */
async function runCleanup(request: NextRequest) {
  const expected = serverEnv().CRON_SECRET
  const header = request.headers.get('authorization')
  const provided =
    header?.startsWith('Bearer ') === true
      ? header.slice(7)
      : new URL(request.url).searchParams.get('secret')

  if (!provided || provided !== expected) {
    log.warn('cron/cleanup', 'Yetkisiz temizlik denemesi')
    return unauthorized()
  }

  const now = new Date()
  let photosDeleted = 0
  let errors = 0

  // 1) Süresi dolmuş ama hâlâ ACTIVE görünen etkinlikleri işaretle.
  const expiredEvents = await prisma.event.findMany({
    where: { expiresAt: { not: null, lte: now }, status: { in: ['ACTIVE', 'EXPIRED'] } },
    select: { id: true, slug: true, status: true },
  })

  for (const event of expiredEvents) {
    if (event.status === 'ACTIVE') {
      await prisma.event.update({ where: { id: event.id }, data: { status: 'EXPIRED' } })
    }
  }

  // 2) Süresi dolmuş etkinliklerin fotoğraflarını sil.
  const expiredIds = expiredEvents.map((e) => e.id)
  if (expiredIds.length > 0) {
    const photos = await prisma.photo.findMany({
      where: { eventId: { in: expiredIds } },
      select: { id: true, publicId: true },
      take: MAX_PHOTOS_PER_RUN,
    })

    for (let i = 0; i < photos.length; i += CLOUDINARY_BATCH) {
      const batch = photos.slice(i, i + CLOUDINARY_BATCH)
      const { deleted, missing, failed } = await deleteResources(batch.map((p) => p.publicId))
      const removable = new Set([...deleted, ...missing])
      const ids = batch.filter((p) => removable.has(p.publicId)).map((p) => p.id)

      if (ids.length > 0) {
        await prisma.photo.deleteMany({ where: { id: { in: ids } } })
        photosDeleted += ids.length
      }
      errors += failed.length
    }

    // 3) Tüm fotoğrafları gitmiş etkinlikleri arşivle.
    for (const eventId of expiredIds) {
      const remaining = await prisma.photo.count({ where: { eventId } })
      if (remaining === 0) {
        await prisma.event.update({ where: { id: eventId }, data: { status: 'ARCHIVED' } })
      }
    }
  }

  // 4) Kullanılmamış, süresi geçmiş yükleme izinlerini temizle.
  const staleTickets = await prisma.uploadTicket.deleteMany({
    where: { expiresAt: { lt: now }, consumedAt: null },
  })

  const detail = `${expiredEvents.length} etkinlik, ${photosDeleted} fotoğraf, ${staleTickets.count} izin`

  await prisma.cleanupLog.create({
    data: {
      eventsProcessed: expiredEvents.length,
      photosDeleted,
      errors,
      detail,
    },
  })

  log.info('cron/cleanup', 'Temizlik tamamlandı', {
    eventsProcessed: expiredEvents.length,
    photosDeleted,
    errors,
    staleTickets: staleTickets.count,
  })

  return NextResponse.json({
    ok: true,
    eventsProcessed: expiredEvents.length,
    photosDeleted,
    ticketsRemoved: staleTickets.count,
    errors,
    // Sınıra takıldıysak yarınki çalıştırma kalanları alır.
    truncated: photosDeleted >= MAX_PHOTOS_PER_RUN,
  })
}

export const GET = withErrorHandling('cron/cleanup', runCleanup)
export const POST = withErrorHandling('cron/cleanup', runCleanup)
