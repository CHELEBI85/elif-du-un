import Link from 'next/link'
import { Images, QrCode, Settings2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EventStatusBadge } from './event-status-badge'
import { formatBytes, formatCount, formatDate, formatRemaining } from '@/lib/format'
import type { EventStatus } from '@prisma/client'

interface EventCardProps {
  event: {
    id: string
    coupleName: string
    title: string
    eventDate: Date | null
    status: EventStatus
    expiresAt: Date | null
  }
  photoCount: number
  storageBytes: number
}

export function EventCard({ event, photoCount, storageBytes }: EventCardProps) {
  return (
    <Card className="flex flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate font-serif text-2xl font-medium text-ink">{event.coupleName}</h2>
          <p className="mt-1 truncate text-xs text-muted">{event.title}</p>
        </div>
        <EventStatusBadge status={event.status} />
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted">Fotoğraf</dt>
          <dd className="mt-1 font-serif text-xl tabular-nums text-ink">
            {formatCount(photoCount)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted">Depolama</dt>
          <dd className="mt-1 font-serif text-xl tabular-nums text-ink">
            {formatBytes(storageBytes)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted">Tarih</dt>
          <dd className="mt-1 text-sm text-ink-soft">{formatDate(event.eventDate)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted">Süre</dt>
          <dd className="mt-1 text-sm text-ink-soft">{formatRemaining(event.expiresAt)}</dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/events/${event.id}/gallery`}>
            <Images aria-hidden="true" />
            Galeri
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/admin/events/${event.id}/qr`}>
            <QrCode aria-hidden="true" />
            QR Kod
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/events/${event.id}/settings`}>
            <Settings2 aria-hidden="true" />
            Ayarlar
          </Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="ml-auto">
          <Link href={`/admin/events/${event.id}`}>Detay</Link>
        </Button>
      </div>
    </Card>
  )
}
