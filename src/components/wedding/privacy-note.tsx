import { Lock } from 'lucide-react'
import { messages } from '@/lib/messages'

export function PrivacyNote({ retentionDays }: { retentionDays: number }) {
  return (
    <p className="mx-auto flex max-w-sm items-start justify-center gap-2 text-center text-xs leading-relaxed text-muted">
      <Lock className="mt-0.5 size-3 shrink-0 text-faint" aria-hidden="true" />
      <span>
        {messages.upload.privacy} Fotoğraflar yaklaşık {retentionDays} gün boyunca geçici olarak
        saklanır.
      </span>
    </p>
  )
}
