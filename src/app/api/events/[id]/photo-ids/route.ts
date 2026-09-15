import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { listPhotoIds } from '@/lib/photos'
import { withErrorHandling } from '@/lib/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * Etkinlikteki tüm fotoğrafların kimlikleri. Yalnızca yönetici.
 *
 * Galeri fotoğrafları 48'er yükler; "Tümünü Seç" yalnızca ekrandakileri
 * seçerse yönetici 727 yerine 48 fotoğraf silmiş olurdu. Kimlikler küçük
 * (~25 bayt) olduğu için binlerce fotoğrafta bile yanıt hafiftir.
 */
export const GET = withErrorHandling(
  'api/events/[id]/photo-ids',
  async (_request: Request, context: RouteContext) => {
    await requireSession()
    const { id } = await context.params
    return NextResponse.json({ ids: await listPhotoIds(id) })
  },
)
