import { NextResponse, type NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deletePhotos } from '@/lib/photos'
import { bulkDeleteSchema } from '@/lib/validation'
import { badRequest, notFound, withErrorHandling } from '@/lib/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Seçili fotoğrafları toplu siler. Yalnızca yönetici. */
export const POST = withErrorHandling('api/photos/bulk-delete', async (request: NextRequest) => {
  await requireSession()

  const body: unknown = await request.json().catch(() => null)
  const parsed = bulkDeleteSchema.safeParse(body)
  if (!parsed.success) return badRequest()

  const { photoIds } = parsed.data

  // Tüm fotoğrafların aynı etkinliğe ait olduğunu doğrula.
  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds } },
    select: { id: true, eventId: true },
  })
  if (photos.length === 0) return notFound('Fotoğraf bulunamadı.')

  const eventIds = new Set(photos.map((p) => p.eventId))
  if (eventIds.size !== 1) return badRequest()

  const eventId = photos[0]?.eventId
  if (!eventId) return badRequest()

  const outcome = await deletePhotos(
    eventId,
    photos.map((p) => p.id),
  )

  return NextResponse.json(outcome)
})
