import { NextResponse, type NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEventBySlug, resolveUploadState } from '@/lib/events'
import { deleteResourceSafe, originalUrl, thumbnailUrl } from '@/lib/cloudinary'
import { createPhotoSchema } from '@/lib/validation'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { badRequest, jsonError, notFound, rateLimited, withErrorHandling } from '@/lib/api'
import { messages } from '@/lib/messages'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cloudinary yüklemesi tamamlandıktan sonra fotoğraf üst verisini kaydeder.
 *
 * Tutarlılık kuralı: Cloudinary'ye yükleme başarılı olmuş ama veritabanı
 * kaydı başarısız olmuşsa, yüklenen dosya Cloudinary'den silinir. Böylece
 * hiçbir zaman sahipsiz (orphan) kaynak kalmaz.
 */
export const POST = withErrorHandling('api/photos', async (request: NextRequest) => {
  const ip = clientIp(request.headers)
  // Aynı IP'yi paylaşan birçok misafir düşünülerek geniş tutuldu; kesin
  // koruma tek kullanımlık izinler ve oturum başına fotoğraf sınırıdır.
  const limit = rateLimit(`photos:${ip}`, 600, 60_000)
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds)

  const body: unknown = await request.json().catch(() => null)
  const parsed = createPhotoSchema.safeParse(body)
  if (!parsed.success) return badRequest()

  const input = parsed.data

  const event = await getEventBySlug(input.slug)
  if (!event) {
    await deleteResourceSafe(input.publicId)
    return notFound()
  }

  const { canUpload } = resolveUploadState(event)
  if (!canUpload) {
    await deleteResourceSafe(input.publicId)
    return jsonError('EVENT_EXPIRED', messages.errors.expired, 403)
  }

  // İzin doğrulaması: bu public_id gerçekten bu oturum için bizim tarafımızdan
  // üretildi mi, hâlâ geçerli mi ve daha önce kullanılmadı mı?
  const ticket = await prisma.uploadTicket.findUnique({ where: { publicId: input.publicId } })
  const ticketValid =
    ticket !== null &&
    ticket.eventId === event.id &&
    ticket.sessionId === input.sessionId &&
    ticket.consumedAt === null &&
    ticket.expiresAt.getTime() > Date.now()

  if (!ticketValid) {
    log.warn('api/photos', 'Geçersiz yükleme izni reddedildi', { eventId: event.id })
    await deleteResourceSafe(input.publicId)
    return badRequest()
  }

  try {
    const photo = await prisma.$transaction(async (tx) => {
      // İzni atomik olarak tüket; eşzamanlı ikinci istek 0 satır günceller.
      const consumed = await tx.uploadTicket.updateMany({
        where: { publicId: input.publicId, consumedAt: null },
        data: { consumedAt: new Date() },
      })
      if (consumed.count === 0) throw new Error('İzin zaten kullanılmış')

      const created = await tx.photo.create({
        data: {
          eventId: event.id,
          publicId: input.publicId,
          secureUrl: originalUrl(input.publicId, input.format),
          thumbnailUrl: thumbnailUrl(input.publicId),
          originalFilename: input.originalFilename ?? null,
          format: input.format,
          width: input.width,
          height: input.height,
          fileSize: input.bytes,
          uploaderSessionId: input.sessionId,
        },
      })

      await tx.event.update({
        where: { id: event.id },
        data: { uploadCount: { increment: 1 } },
      })

      return created
    })

    return NextResponse.json({ id: photo.id, createdAt: photo.createdAt }, { status: 201 })
  } catch (error) {
    // Veritabanı yazamadı: Cloudinary'de sahipsiz dosya bırakmıyoruz.
    log.error('api/photos', 'Kayıt başarısız, Cloudinary dosyası siliniyor', {
      eventId: event.id,
      error: error instanceof Error ? error.message : 'bilinmeyen hata',
    })
    await deleteResourceSafe(input.publicId)
    return jsonError('SERVER_ERROR', messages.errors.uploadFailed, 500)
  }
})
