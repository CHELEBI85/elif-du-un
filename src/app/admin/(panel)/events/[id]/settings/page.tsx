import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/admin/page-header'
import { EventForm } from '@/components/admin/event-form'
import { DeleteEventCard } from '@/components/admin/delete-event-card'
import { updateEventAction } from '../../actions'
import { appUrl } from '@/lib/env'

export const metadata: Metadata = { title: 'Etkinlik Ayarları' }
export const dynamic = 'force-dynamic'
// Etkinlik silme (sunucu eylemi) tüm fotoğrafları Cloudinary'den 100'erli çağrılarla
// siler; binlerce fotoğrafta varsayılan süre yetmeyebilir.
export const maxDuration = 60

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EventSettingsPage({ params }: PageProps) {
  const { id } = await params
  const event = await prisma.event.findUnique({ where: { id } })
  if (!event) notFound()

  const photoCount = await prisma.photo.count({ where: { eventId: id } })

  return (
    <>
      <PageHeader
        title="Etkinlik Ayarları"
        description={event.coupleName}
        backHref={`/admin/events/${id}`}
        backLabel="Etkinlik"
      />

      <EventForm
        action={updateEventAction}
        submitLabel="Değişiklikleri Kaydet"
        appUrl={appUrl()}
        event={event}
      />

      <div className="mt-14 max-w-2xl">
        <DeleteEventCard eventId={event.id} coupleName={event.coupleName} photoCount={photoCount} />
      </div>
    </>
  )
}
