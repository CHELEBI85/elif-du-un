import { NextResponse, type NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deletePhotos } from '@/lib/photos'
import { bulkDeleteSchema } from '@/lib/validation'
import { badRequest, notFound, withErrorHandling } from '@/lib/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
// Bir parça (en fazla 100 fotoğraf) tek Cloudinary çağrısıdır ve ~1 sn sürer;
// yavaş bir anda bile süre sınırına takılmasın diye pay bırakılıyor.
export const maxDuration = 60

/**
 * Seçili fotoğrafları siler. Yalnızca yönetici.
 *
 * İstemci büyük seçimleri DELETE_BATCH_SIZE'lık parçalar hâlinde gönderir.
 * Yanıt hangi fotoğrafların silindiğini tek tek döndürür; böylece kısmi
 * başarıda arayüz yalnızca gerçekten silinenleri kaldırır.
 */
export const POST = withErrorHandling('api/photos/bulk-delete', async (request: NextRequest) => {
  await requireSession()

  const body: unknown = await request.json().catch(() => null)
  const parsed = bulkDeleteSchema.safeParse(body)
  if (!parsed.success) return badRequest()

  const { eventId, photoIds } = parsed.data

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } })
  if (!event) return notFound('Etkinlik bulunamadı.')

  // deletePhotos yalnızca bu etkinliğe ait kayıtlara dokunur; başka etkinliğin
  // kimliği gönderilse bile silinmez.
  const outcome = await deletePhotos(eventId, [...new Set(photoIds)])
  return NextResponse.json(outcome)
})
