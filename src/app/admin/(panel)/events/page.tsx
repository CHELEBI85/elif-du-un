import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarHeart, Plus } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/admin/page-header'
import { EventCard } from '@/components/admin/event-card'
import { EmptyState } from '@/components/admin/empty-state'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = { title: 'Etkinlikler' }
export const dynamic = 'force-dynamic'

export default async function EventsPage() {
  const events = await prisma.event.findMany({ orderBy: { createdAt: 'desc' } })

  // Tek sorguda tüm etkinliklerin toplamları — etkinlik başına ayrı sorgu yok.
  const totals = await prisma.photo.groupBy({
    by: ['eventId'],
    _count: { _all: true },
    _sum: { fileSize: true },
  })
  const byEvent = new Map(totals.map((t) => [t.eventId, t]))

  return (
    <>
      <PageHeader
        title="Etkinlikler"
        description="Düğün etkinliklerini yönet, galerileri ve QR kodlarını görüntüle."
        actions={
          <Button asChild variant="primary" size="md">
            <Link href="/admin/events/new">
              <Plus aria-hidden="true" />
              Yeni Etkinlik
            </Link>
          </Button>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarHeart className="size-5" aria-hidden="true" />}
          title="Henüz etkinlik yok"
          description="İlk düğün etkinliğini oluşturarak misafirlerin fotoğraf paylaşmasını sağlayabilirsin."
          action={
            <Button asChild variant="primary" size="md">
              <Link href="/admin/events/new">Yeni Etkinlik</Link>
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {events.map((event) => {
            const stats = byEvent.get(event.id)
            return (
              <EventCard
                key={event.id}
                event={event}
                photoCount={stats?._count._all ?? 0}
                storageBytes={stats?._sum.fileSize ?? 0}
              />
            )
          })}
        </div>
      )}
    </>
  )
}
