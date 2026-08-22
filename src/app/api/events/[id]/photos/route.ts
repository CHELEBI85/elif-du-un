import { NextResponse, type NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth'
import { listPhotos } from '@/lib/photos'
import { withErrorHandling } from '@/lib/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 48
const MAX_LIMIT = 96

interface RouteContext {
  params: Promise<{ id: string }>
}

/** Galeri için imleç tabanlı fotoğraf listesi. Yalnızca yönetici. */
export const GET = withErrorHandling(
  'api/events/[id]/photos',
  async (request: NextRequest, context: RouteContext) => {
    await requireSession()
    const { id } = await context.params

    const url = new URL(request.url)
    const cursor = url.searchParams.get('cursor')
    const rawLimit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT)
    const limit = Number.isFinite(rawLimit)
      ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(rawLimit)))
      : DEFAULT_LIMIT

    const page = await listPhotos(id, cursor, limit)
    return NextResponse.json(page)
  },
)
