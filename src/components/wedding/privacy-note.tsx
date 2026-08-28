import { Lock } from 'lucide-react'
import { messages } from '@/lib/messages'

/**
 * Misafire gösterilen gizlilik notu.
 *
 * `retentionDays` boş geldiğinde etkinlik süresiz saklanıyor demektir; bu
 * durumda "geçici olarak saklanır" demek yanlış olur, o yüzden saklama
 * cümlesi tamamen kaldırılır. Uygulanmayan bir vaat metinde durmamalı.
 */
export function PrivacyNote({ retentionDays }: { retentionDays: number | null }) {
  return (
    <p className="mx-auto flex max-w-sm items-start justify-center gap-2 text-center text-xs leading-relaxed text-muted">
      <Lock className="mt-0.5 size-3 shrink-0 text-faint" aria-hidden="true" />
      <span>
        {messages.upload.privacy}
        {retentionDays !== null
          ? ` Fotoğraflar yaklaşık ${retentionDays} gün boyunca geçici olarak saklanır.`
          : null}
      </span>
    </p>
  )
}
