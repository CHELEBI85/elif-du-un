import type { EventStatus } from '@prisma/client'
import { Badge } from '@/components/ui/badge'

const LABELS: Record<EventStatus, { text: string; variant: 'active' | 'neutral' | 'expired' }> = {
  ACTIVE: { text: 'Aktif', variant: 'active' },
  EXPIRED: { text: 'Süresi doldu', variant: 'expired' },
  ARCHIVED: { text: 'Arşivlendi', variant: 'neutral' },
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  const config = LABELS[status]
  return <Badge variant={config.variant}>{config.text}</Badge>
}
