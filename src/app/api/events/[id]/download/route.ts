import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, withErrorHandling } from '@/lib/api'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/** Windows/macOS'ta dosya adında sorun çıkaran karakterleri temizler. */
function safeBaseName(original: string | null): string {
  const base = (original ?? '')
    .replace(/\.[^.]*$/, '')
    .replace(/[\\/:*?"<>|\x00-\x1f]/g, '_')
    .trim()
    .slice(0, 80)
  return base.length > 0 ? base : 'foto'
}

/**
 * "Tüm fotoğrafları indir" için dosya listesi.
 *
 * ZIP artık Cloudinary'de değil, yöneticinin tarayıcısında oluşturuluyor.
 * Cloudinary'nin anında ürettiği arşivler ücretsiz planda ~100 MB'da
 * kesiliyor ve kalan fotoğrafları hata vermeden dışarıda bırakıyordu
 * (727 fotoğraf istendi, ZIP'te 137 çıktı).
 *
 * Adlar sıra numarasıyla benzersizleştirilir: iPhone'lar birçok fotoğrafı
 * aynı adla ("image.jpg", "IMG_1234.jpg") gönderir; aynı adlı dosyalar
 * ZIP'i açarken birbirinin üzerine yazılırdı.
 */
export const GET = withErrorHandling(
  'api/events/[id]/download',
  async (_request: Request, context: RouteContext) => {
    await requireSession()
    const { id } = await context.params

    const event = await prisma.event.findUnique({ where: { id }, select: { id: true } })
    if (!event) return notFound('Etkinlik bulunamadı.')

    const photos = await prisma.photo.findMany({
      where: { eventId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        secureUrl: true,
        originalFilename: true,
        format: true,
        fileSize: true,
        createdAt: true,
      },
    })

    const width = Math.max(4, String(photos.length).length)
    const files = photos.map((photo, index) => ({
      url: photo.secureUrl,
      name: `${String(index + 1).padStart(width, '0')}_${safeBaseName(photo.originalFilename)}.${photo.format}`,
      size: photo.fileSize,
      lastModified: photo.createdAt.toISOString(),
    }))

    const totalBytes = photos.reduce((sum, photo) => sum + photo.fileSize, 0)

    log.info('api/events/[id]/download', 'İndirme listesi üretildi', {
      eventId: id,
      photoCount: files.length,
      totalBytes,
    })

    return NextResponse.json({ files, totalBytes })
  },
)
