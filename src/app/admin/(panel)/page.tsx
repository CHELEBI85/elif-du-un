import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarClock, HardDrive, Images, PartyPopper } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { formatBytes, formatCount, formatDateTime, formatRemaining } from '@/lib/format'
import { StatCard } from '@/components/admin/stat-card'
import { PageHeader } from '@/components/admin/page-header'
import { EmptyState } from '@/components/admin/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'Genel Bakış' }
export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const [activeEvents, photoAggregate, nextExpiring, recentPhotos, lastCleanup] = await Promise.all([
    prisma.event.count({ where: { status: 'ACTIVE' } }),
    prisma.photo.aggregate({ _count: { _all: true }, _sum: { fileSize: true } }),
    prisma.event.findFirst({
      where: { status: 'ACTIVE', expiresAt: { not: null } },
      orderBy: { expiresAt: 'asc' },
      select: { id: true, coupleName: true, expiresAt: true },
    }),
    prisma.photo.findMany({
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        thumbnailUrl: true,
        createdAt: true,
        fileSize: true,
        event: { select: { id: true, coupleName: true, status: true } },
      },
    }),
    prisma.cleanupLog.findFirst({ orderBy: { runAt: 'desc' } }),
  ])

  const photoCount = photoAggregate._count._all
  const storageBytes = photoAggregate._sum.fileSize ?? 0
  const averageBytes = photoCount > 0 ? Math.round(storageBytes / photoCount) : 0

  return (
    <>
      <PageHeader
        title="Genel Bakış"
        description="Etkinliklerin, misafir fotoğraflarının ve depolama kullanımının özeti."
        actions={
          <Button asChild variant="outline" size="md">
            <Link href="/admin/events">Etkinlikler</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Aktif etkinlik"
          value={formatCount(activeEvents)}
          icon={<PartyPopper className="size-4" aria-hidden="true" />}
        />
        <StatCard
          label="Toplam fotoğraf"
          value={formatCount(photoCount)}
          hint={photoCount > 0 ? `Ortalama ${formatBytes(averageBytes)}` : undefined}
          icon={<Images className="size-4" aria-hidden="true" />}
        />
        <StatCard
          label="Tahmini depolama"
          value={formatBytes(storageBytes)}
          hint="Veritabanındaki dosya boyutlarından hesaplanır."
          icon={<HardDrive className="size-4" aria-hidden="true" />}
          tone="gold"
        />
        <StatCard
          label="Süre bitimi"
          value={nextExpiring ? formatRemaining(nextExpiring.expiresAt) : '—'}
          hint={nextExpiring?.coupleName}
          icon={<CalendarClock className="size-4" aria-hidden="true" />}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Son yüklemeler</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPhotos.length === 0 ? (
              <EmptyState
                icon={<Images className="size-5" aria-hidden="true" />}
                title="Henüz fotoğraf yok"
                description="Misafirlerin fotoğraf yüklediğinde burada görebileceksin."
              />
            ) : (
              <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
                {recentPhotos.map((photo) => (
                  <li key={photo.id}>
                    <Link
                      href={`/admin/events/${photo.event.id}/gallery`}
                      className="block overflow-hidden rounded-md border border-line"
                      title={formatDateTime(photo.createdAt)}
                    >
                      {/* Küçük önizleme — orijinal dosya asla yüklenmez. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.thumbnailUrl}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="aspect-square w-full object-cover"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Otomatik temizlik</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 text-sm">
            {lastCleanup ? (
              <>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">Son çalışma</p>
                  <p className="mt-1 text-ink">{formatDateTime(lastCleanup.runAt)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted">Sonuç</p>
                  <p className="mt-1 leading-relaxed text-ink-soft">{lastCleanup.detail ?? '—'}</p>
                </div>
                {lastCleanup.errors > 0 ? (
                  <p className="rounded-md bg-danger-wash px-3 py-2 text-xs leading-relaxed text-danger">
                    {lastCleanup.errors} kaynak silinemedi. Bir sonraki çalışmada tekrar denenecek.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="leading-relaxed text-muted">
                Temizlik işi henüz çalışmadı. Vercel Cron her gün 03:00 UTC saatinde süresi dolmuş
                etkinliklerin fotoğraflarını siler.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
