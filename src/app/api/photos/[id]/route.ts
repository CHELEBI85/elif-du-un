import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deletePhotos } from '@/lib/photos'
import { serverError, withErrorHandling } from '@/lib/api'
import { log } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Tek bir fotoğrafı siler. Yalnızca yönetici.
 *
 * Fotoğraf zaten yoksa (çift tıklama, başka sekmeden silinmiş) hata değil
 * başarı döner: kullanıcının istediği sonuç zaten gerçekleşmiştir.
 */
export const DELETE = withErrorHandling(
  'api/photos/[id]',
  async (_request: Request, context: RouteContext) => {
    await requireSession()
    const { id } = await context.params

    const photo = await prisma.photo.findUnique({ where: { id }, select: { eventId: true } })
    if (!photo) {
      return NextResponse.json({ deleted: 1, failed: 0, deletedIds: [id], failedIds: [] })
    }

    const outcome = await deletePhotos(photo.eventId, [id])
    if (outcome.failed > 0) {
      log.error('api/photos/[id]', 'Fotoğraf silinemedi', { photoId: id })
      return serverError()
    }

    return NextResponse.json(outcome)
  },
)
