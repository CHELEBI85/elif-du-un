import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { signedArchiveRequest, type SignedArchiveRequest } from '@/lib/cloudinary'
import { notFound, withErrorHandling } from '@/lib/api'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Tek ZIP'e konulacak en fazla fotoğraf.
 * Cloudinary tek arşivde 727 fotoğrafı da kabul ediyor (denendi), ama ~1 GB'lık
 * tek dosya bağlantı bir kez koptuğunda baştan inmek zorunda kalır. 500'lük
 * parçalar hem bu riski azaltır hem de arşiv başına dosya sınırının altında kalır.
 */
const ARCHIVE_CHUNK_SIZE = 500

interface RouteContext {
  params: Promise<{ id: string }>
}

interface DownloadArchive extends SignedArchiveRequest {
  label: string
  count: number
}

/**
 * Tüm fotoğraflar için imzalı ZIP indirme istekleri üretir.
 *
 * Adres değil POST alanları döndürülür: fotoğraf kimliklerini adrese koymak
 * yüzlerce fotoğrafta "414 Request-URI Too Large" hatasına yol açıyordu.
 * Arşiv Cloudinary tarafında akış olarak üretilip doğrudan tarayıcıya iner;
 * Vercel fonksiyonu hiçbir görüntüyü belleğe almaz.
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

    const total = Math.ceil(photos.length / ARCHIVE_CHUNK_SIZE)
    const archives: DownloadArchive[] = []

    for (let i = 0; i < photos.length; i += ARCHIVE_CHUNK_SIZE) {
      const chunk = photos.slice(i, i + ARCHIVE_CHUNK_SIZE)
      const part = Math.floor(i / ARCHIVE_CHUNK_SIZE) + 1
      const first = i + 1
      const last = i + chunk.length

      archives.push({
        ...signedArchiveRequest(
          chunk.map((p) => p.publicId),
          total > 1 ? `${event.slug}-fotograflar-${part}` : `${event.slug}-fotograflar`,
        ),
        count: chunk.length,
        label: total > 1 ? `Bölüm ${part} / ${total} · ${first}–${last}` : 'Tüm fotoğraflar',
      })
    }

    log.info('api/events/[id]/download', 'Arşiv istekleri üretildi', {
      eventId: id,
      photoCount: photos.length,
      archiveCount: archives.length,
    })

    return NextResponse.json({ archives, photoCount: photos.length })
  },
)
