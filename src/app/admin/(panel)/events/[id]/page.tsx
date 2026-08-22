import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Images, QrCode, Settings2 } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { getEventStats, resolveUploadState } from '@/lib/events'
import { weddingUrl } from '@/lib/qr'
import { formatBytes, formatCount, formatDate, formatRemaining } from '@/lib/format'
import { PageHeader } from '@/components/admin/page-header'
import { StatCard } from '@/components/admin/stat-card'
import { EventStatusBadge } from '@/components/admin/event-status-badge'
import { DownloadAllButton } from '@/components/admin/download-all-button'
import { CopyLink } from '@/components/admin/copy-link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id }, select: { coupleName: true } })
  return { title: event?.coupleName ?? 'Etkinlik' }
}

export default async function EventDetailPage({ params }: PageProps) {
  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) notFound()

  const stats = await getEventStats(event.id)
  const uploadState = resolveUploadState(event)
  const url = weddingUrl(event.slug)

  return (
    <>
      <PageHeader
        title={event.coupleName}
        description={event.title}
        backHref="/admin/events"
        backLabel="Etkinlikler"
        actions={
          <>
            <Button asChild variant="primary" size="md">
              <Link href={`/admin/events/${event.id}/gallery`}>
                <Images aria-hidden="true" />
                Galeriyi Aç
              </Link>
            </Button>
            <Button asChild variant="outline" size="md">
              <Link href={`/admin/events/${event.id}/qr`}>
                <QrCode aria-hidden="true" />
                QR Kodu
              </Link>
            </Button>
            <Button asChild variant="ghost" size="md">
              <Link href={`/admin/events/${event.id}/settings`}>
                <Settings2 aria-hidden="true" />
                Ayarlar
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Fotoğraf" value={formatCount(stats.photoCount)} />
        <StatCard
          label="Tahmini depolama"
          value={formatBytes(stats.storageBytes)}
          hint={stats.photoCount > 0 ? `Ortalama ${formatBytes(stats.averageBytes)}` : undefined}
          tone="gold"
        />
        <StatCard
          label="Kalan süre"
          value={formatRemaining(event.expiresAt)}
          hint={`${event.retentionDays} günlük saklama`}
          tone={uploadState.isExpired ? 'warning' : 'default'}
        />
        <StatCard
          label="Toplam yükleme"
          value={formatCount(event.uploadCount)}
          hint="Silinenler dahil kümülatif"
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Etkinlik bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="flex flex-col divide-y divide-line text-sm">
              <div className="flex items-center justify-between gap-4 py-3 first:pt-0">
                <dt className="text-muted">Gelin</dt>
                <dd className="text-right text-ink">{event.brideName}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted">Damat</dt>
                <dd className="text-right text-ink">{event.groomName}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted">Düğün tarihi</dt>
                <dd className="text-right text-ink">{formatDate(event.eventDate)}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted">Durum</dt>
                <dd className="text-right">
                  <EventStatusBadge status={event.status} />
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <dt className="text-muted">Yükleme</dt>
                <dd className="text-right text-ink">
                  {uploadState.canUpload
                    ? 'Açık'
                    : uploadState.manuallyDisabled
                      ? 'Elle kapatıldı'
                      : 'Süresi doldu'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
                <dt className="text-muted">Silinme tarihi</dt>
                <dd className="text-right text-ink">{formatDate(event.expiresAt)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Misafir bağlantısı</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <CopyLink url={url} />
            <p className="text-xs leading-relaxed text-muted">
              QR kodu bu adrese yönlendirir. Bağlantı adresini değiştirirsen basılı QR kodları
              geçersiz olur.
            </p>
            <div className="border-t border-line pt-5">
              <DownloadAllButton eventId={event.id} photoCount={stats.photoCount} />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
