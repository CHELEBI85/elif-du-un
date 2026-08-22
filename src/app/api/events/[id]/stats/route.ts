import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth'
import { getEventStats } from '@/lib/events'
import { withErrorHandling } from '@/lib/api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/** Fotoğraf sayısı ve tahmini depolama. Yalnızca yönetici. */
export const GET = withErrorHandling(
  'api/events/[id]/stats',
  async (_request: Request, context: RouteContext) => {
    await requireSession()
    const { id } = await context.params
    return NextResponse.json(await getEventStats(id))
  },
)
