import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { archiveDownloadUrl } from '@/lib/cloudinary'
import { notFound, withErrorHandling } from '@/lib/api'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cloudinary tek bir arşivde en fazla 1000 kaynak kabul eder; bu yüzden
 * fotoğraflar parçalara bölünür ve her parça için ayrı bir indirme adresi
 * döndürülür.
 */
const ARCHIVE_CHUNK_SIZE = 900

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Tüm fotoğraflar için ZIP indirme adresleri üretir.
 *
 * Neden bu yaklaşım: arşiv Cloudinary tarafında oluşturulur ve doğrudan
 * tarayıcıya sunulur. Vercel fonksiyonu hiçbir görüntüyü belleğe almaz,
 * dolayısıyla sunucusuz bellek ve süre limitlerine takılmaz.
 */
export const GET = withErrorHandling(
  'api/events/[id]/download',
  async (_request: Request, context: RouteContext) => {
    await requireSession()
    const { id } = await context.params

    const event = await prisma.event.findUnique({ where: { id }, select: { slug: true } })
    if (!event) return notFound('Etkinlik bulunamadı.')

    const photos = await prisma.photo.findMany({
      where: { eventId: id },
      orderBy: { createdAt: 'asc' },
      select: { publicId: true },
    })

    if (photos.length === 0) {
      return NextResponse.json({ archives: [], photoCount: 0 })
    }

    const archives: Array<{ url: string; count: number; label: string }> = []
    for (let i = 0; i < photos.length; i += ARCHIVE_CHUNK_SIZE) {
      const chunk = photos.slice(i, i + ARCHIVE_CHUNK_SIZE)
      const part = Math.floor(i / ARCHIVE_CHUNK_SIZE) + 1
      const total = Math.ceil(photos.length / ARCHIVE_CHUNK_SIZE)
      archives.push({
        url: archiveDownloadUrl(
          chunk.map((p) => p.publicId),
          total > 1 ? `${event.slug}-fotograflar-${part}` : `${event.slug}-fotograflar`,
        ),
        count: chunk.length,
        label: total > 1 ? `Bölüm ${part} / ${total}` : 'Tüm fotoğraflar',
      })
    }

    log.info('api/events/[id]/download', 'Arşiv adresleri üretildi', {
      eventId: id,
      photoCount: photos.length,
      archiveCount: archives.length,
    })

    return NextResponse.json({ archives, photoCount: photos.length })
  },
)
