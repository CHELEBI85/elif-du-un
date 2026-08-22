'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { messages } from '@/lib/messages'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Sunucu tarafı ayrıntılar loglanır; kullanıcıya asla teknik detay gösterilmez.
    console.error('İstemci hatası', error.digest ?? error.message)
  }, [error])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ivory px-6 text-center">
      <div className="rule-gold mb-6 w-16" />
      <h1 className="text-display-sm text-ink">{messages.errors.server}</h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
        Beklenmedik bir sorun oluştu. Sayfayı yenilemeyi deneyebilirsiniz.
      </p>
      <Button variant="primary" size="lg" className="mt-8" onClick={reset}>
        Tekrar dene
      </Button>
    </main>
  )
}
