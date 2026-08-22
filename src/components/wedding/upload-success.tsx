'use client'

import { Button } from '@/components/ui/button'
import { messages } from '@/lib/messages'
import { Ornament } from './ornament'
import { Celebration } from './celebration'

interface UploadSuccessProps {
  coupleName: string
  uploadedCount: number
  onUploadMore: () => void
}

/** Yükleme bittiğinde gösterilen sıcak teşekkür ekranı. Yönlendirme yapılmaz. */
export function UploadSuccess({ coupleName, uploadedCount, onUploadMore }: UploadSuccessProps) {
  return (
    <section
      aria-labelledby="success-title"
      className="flex flex-col items-center px-2 py-4 text-center"
    >
      {/* Fotoğraflar ulaştığı anda merkezden saçılan kutlama. */}
      <Celebration mode="burst" runKey={uploadedCount} />

      <span className="relative flex size-24 items-center justify-center">
        {/* Dışa doğru açılan iki ince halka — sessiz bir kutlama. */}
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-ring rounded-full border border-gold/30"
        />
        <span
          aria-hidden="true"
          className="absolute inset-3 animate-ring rounded-full border border-gold/50"
          style={{ animationDelay: '0.12s' }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-5 animate-scale-in rounded-full bg-gold-wash"
        />
        <svg viewBox="0 0 24 24" fill="none" className="relative size-9 text-gold-deep" aria-hidden="true">
          <path
            d="M4.5 12.5 10 18 19.5 7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="48"
            style={{ animation: 'var(--animate-draw)' }}
          />
        </svg>
      </span>

      <h2 id="success-title" className="mt-8 font-serif text-4xl font-light text-ink">
        {messages.success.title}
      </h2>

      <Ornament className="mt-6" width="w-20" />

      <p className="pull-quote mt-7 max-w-xs">{messages.success.body(coupleName)}</p>

      <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted">{messages.success.sub}</p>

      <p className="mt-7 text-xs tabular-nums tracking-wide text-muted">
        {uploadedCount} fotoğraf paylaşıldı
      </p>

      <Button variant="outline" size="lg" className="mt-8 w-full sm:w-auto" onClick={onUploadMore}>
        {messages.success.again}
      </Button>
    </section>
  )
}
