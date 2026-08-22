import Link from 'next/link'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Ornament } from '@/components/wedding/ornament'

export const dynamic = 'force-dynamic'

/**
 * Kök sayfa. Tek bir aktif düğün varsa misafiri doğrudan oraya götürür;
 * bu, QR kodu okutmayan ama adresi elle yazan misafirler için en kısa yol.
 */
export default async function HomePage() {
  const activeEvent = await prisma.event
    .findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { slug: true },
    })
    .catch(() => null)

  if (activeEvent) redirect(`/w/${activeEvent.slug}`)

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-cream px-6 text-center">
      <div aria-hidden="true" className="vignette-warm absolute inset-0" />
      <div aria-hidden="true" className="paper-grain absolute inset-0 opacity-70" />

      <div className="stagger relative flex flex-col items-center">
        <p className="eyebrow">Düğün Anıları</p>
        <Ornament className="mt-7" width="w-24" />
        <h1 className="text-display-sm mt-9 text-ink">Hoş geldiniz</h1>
        <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted">
          Şu anda aktif bir etkinlik bulunmuyor. Düğün alanındaki QR kodu okutarak
          fotoğraflarınızı paylaşabilirsiniz.
        </p>
        <Button asChild variant="ghost" size="md" className="mt-10">
          <Link href="/admin">Yönetim paneli</Link>
        </Button>
      </div>
    </main>
  )
}
