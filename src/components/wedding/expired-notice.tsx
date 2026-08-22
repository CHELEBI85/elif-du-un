import { Clock } from 'lucide-react'
import { messages } from '@/lib/messages'
import { Ornament } from './ornament'

/** Süresi dolmuş ya da yüklemesi kapatılmış etkinlik için nazik bilgilendirme. */
export function ExpiredNotice({ manuallyDisabled }: { manuallyDisabled?: boolean }) {
  return (
    <section
      aria-labelledby="expired-title"
      className="mx-auto w-full max-w-md rounded-xl border border-line bg-cream/70 px-6 py-12 text-center shadow-soft"
    >
      <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-sand text-muted">
        <Clock className="size-6" aria-hidden="true" />
      </span>

      <h2 id="expired-title" className="mt-7 font-serif text-2xl font-normal text-ink">
        {messages.expiredEvent.title}
      </h2>

      <Ornament className="mt-5" width="w-16" />

      <p className="mt-5 text-sm leading-relaxed text-muted">
        {manuallyDisabled
          ? 'Fotoğraf yükleme şu anda kapalı. Daha sonra tekrar deneyebilirsiniz.'
          : messages.expiredEvent.body}
      </p>
    </section>
  )
}
