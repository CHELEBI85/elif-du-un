import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { listPhotos } from '@/lib/photos'
import { getEventStats } from '@/lib/events'
import { formatBytes, formatCount } from '@/lib/format'
import { PageHeader } from '@/components/admin/page-header'
import { PhotoGallery } from '@/components/admin/photo-gallery'
import { DownloadAllButton } from '@/components/admin/download-all-button'

export const metadata: Metadata = { title: 'Galeri' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 48

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GalleryPage({ params }: PageProps) {
  const { id } = await params

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, coupleName: true },
  })
  if (!event) notFound()

  const [initialPage, stats] = await Promise.all([
    listPhotos(id, null, PAGE_SIZE),
    getEventStats(id),
  ])

  return (
    <>
      <PageHeader
        title="Galeri"
        description={`${event.coupleName} · ${formatCount(stats.photoCount)} fotoğraf · ${formatBytes(
          stats.storageBytes,
        )}`}
        backHref={`/admin/events/${id}`}
        backLabel="Etkinlik"
        actions={<DownloadAllButton eventId={id} photoCount={stats.photoCount} />}
      />

      <PhotoGallery eventId={id} initialPage={initialPage} />
    </>
  )
}
