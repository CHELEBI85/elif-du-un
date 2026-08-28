import type { Metadata } from 'next'
import { CalendarHeart } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/admin/page-header'
import { EventCard } from '@/components/admin/event-card'
import { EmptyState } from '@/components/admin/empty-state'

export const metadata: Metadata = { title: 'Etkinlikler' }
export const dynamic = 'force-dynamic'

/*
  Bu kurulum tek bir düğün için çalışıyor; bu yüzden panelde etkinlik
  oluşturma yolu bulunmuyor. Veri modeli çoklu etkinliği desteklemeye
  devam ediyor (Event tablosu, slug bazlı yönlendirme, etkinliğe göre
  ayrılmış Cloudinary klasörleri), dolayısıyla ileride ikinci bir düğün
  gerekirse yalnızca oluşturma arayüzünü geri eklemek yeterli.

  Yeni etkinlik gerektiğinde: prisma/seed.ts içindeki EVENT sabitini
  güncelleyip `npm run db:seed` çalıştırmak yeterlidir.
*/
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
        title="Etkinlik"
        description="Düğün galerisini, QR kodunu ve ayarları buradan yönetebilirsin."
      />

      {events.length === 0 ? (
        <EmptyState
          icon={<CalendarHeart className="size-5" aria-hidden="true" />}
          title="Etkinlik bulunamadı"
          description="Bu kurulum tek bir düğün içindir. Etkinliği oluşturmak için sunucuda `npm run db:seed` komutunu çalıştır."
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
