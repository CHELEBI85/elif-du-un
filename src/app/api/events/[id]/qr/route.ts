import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, withErrorHandling } from '@/lib/api'
import { buildQrPng, buildQrSvg, weddingUrl } from '@/lib/qr'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * QR kodunu PNG veya SVG olarak indirir.
 * `?format=png|svg` ve `?size=` parametrelerini kabul eder.
 */
export const GET = withErrorHandling(
  'api/events/[id]/qr',
  async (request: Request, context: RouteContext) => {
    await requireSession()
    const { id } = await context.params

    const event = await prisma.event.findUnique({
      where: { id },
      select: { slug: true, coupleName: true },
    })
    if (!event) return notFound('Etkinlik bulunamadı.')

    const url = new URL(request.url)
    const format = url.searchParams.get('format') === 'svg' ? 'svg' : 'png'
    const rawSize = Number(url.searchParams.get('size') ?? 1200)
    const size = Number.isFinite(rawSize) ? Math.min(2400, Math.max(256, Math.trunc(rawSize))) : 1200

    const target = weddingUrl(event.slug)
    const filename = `${event.slug}-qr.${format}`

    if (format === 'svg') {
      const svg = await buildQrSvg(target)
      return new Response(svg, {
        headers: {
          'Content-Type': 'image/svg+xml; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'private, max-age=300',
        },
      })
    }

    const png = await buildQrPng(target, size)
    return new Response(new Uint8Array(png), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=300',
      },
    })
  },
)
