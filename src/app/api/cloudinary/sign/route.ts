import { NextResponse, type NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { getEventBySlug, resolveUploadState, countSessionPhotos } from '@/lib/events'
import {
  MAX_PHOTOS_PER_SESSION,
  SIGNATURE_TTL_SECONDS,
  cloudinaryFolders,
} from '@/lib/constants'
import { apiKey, hashIp, signUpload, uploadEndpoint } from '@/lib/cloudinary'
import { signRequestSchema } from '@/lib/validation'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { badRequest, jsonError, notFound, rateLimited, withErrorHandling } from '@/lib/api'
import { messages } from '@/lib/messages'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Kısa ömürlü, tek kullanımlık Cloudinary yükleme imzaları üretir.
 *
 * Güvenlik notları:
 *  - API secret asla istemciye gitmez; yalnızca imza üretiminde kullanılır.
 *  - Her imza sunucunun belirlediği tek bir public_id'ye bağlıdır, bu yüzden
 *    yeniden kullanılamaz ve istemci hedef klasörü değiştiremez.
 *  - Üretilen her izin veritabanına yazılır; /api/photos yalnızca burada
 *    kayıtlı bir public_id kabul eder.
 */
export const POST = withErrorHandling('api/cloudinary/sign', async (request: NextRequest) => {
  const ip = clientIp(request.headers)

  // İlk savunma hattı. Düğün salonunda misafirlerin çoğu aynı wifi IP'sinden
  // çıktığı ve her 20 fotoğraf için bir istek yapıldığı için sınır cömert.
  const limit = rateLimit(`sign:${ip}`, 60, 60_000)
  if (!limit.ok) return rateLimited(limit.retryAfterSeconds)

  const body: unknown = await request.json().catch(() => null)
  const parsed = signRequestSchema.safeParse(body)
  if (!parsed.success) return badRequest()

  const { slug, sessionId, count } = parsed.data

  const event = await getEventBySlug(slug)
  if (!event) return notFound()

  const { canUpload } = resolveUploadState(event)
  if (!canUpload) return jsonError('EVENT_EXPIRED', messages.errors.expired, 403)

  // Kesin sınır veritabanından okunur — bellek içi sayaçlara güvenilmez.
  const alreadyUploaded = await countSessionPhotos(event.id, sessionId)
  if (alreadyUploaded + count > MAX_PHOTOS_PER_SESSION) {
    return jsonError('SESSION_LIMIT', messages.errors.sessionLimit, 429)
  }

  const folder = cloudinaryFolders.guestPhotos(event.id)
  const timestamp = Math.floor(Date.now() / 1000)
  const expiresAt = new Date(Date.now() + SIGNATURE_TTL_SECONDS * 1000)
  const ipHash = hashIp(ip)

  const tickets = Array.from({ length: count }, () => {
    const publicId = `${folder}/${randomUUID()}`
    return {
      publicId,
      timestamp,
      signature: signUpload({ publicId, timestamp }),
    }
  })

  await prisma.uploadTicket.createMany({
    data: tickets.map((t) => ({
      eventId: event.id,
      publicId: t.publicId,
      sessionId,
      ipHash,
      expiresAt,
    })),
  })

  log.info('api/cloudinary/sign', 'Yükleme izni verildi', { eventId: event.id, count })

  return NextResponse.json({
    tickets: tickets.map((t) => ({
      publicId: t.publicId,
      timestamp: t.timestamp,
      signature: t.signature,
      apiKey: apiKey(),
      uploadUrl: uploadEndpoint(),
    })),
  })
})
