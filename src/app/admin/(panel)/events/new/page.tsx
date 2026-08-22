import type { Metadata } from 'next'
import { PageHeader } from '@/components/admin/page-header'
import { EventForm } from '@/components/admin/event-form'
import { createEventAction } from '../actions'
import { appUrl } from '@/lib/env'

export const metadata: Metadata = { title: 'Yeni Etkinlik' }
export const dynamic = 'force-dynamic'

export default function NewEventPage() {
  return (
    <>
      <PageHeader
        title="Yeni Etkinlik"
        description="Yeni bir düğün oluştur. Kaydettikten sonra QR kodunu indirebilirsin."
        backHref="/admin/events"
        backLabel="Etkinlikler"
      />
      <EventForm action={createEventAction} submitLabel="Etkinliği Oluştur" appUrl={appUrl()} />
    </>
  )
}
