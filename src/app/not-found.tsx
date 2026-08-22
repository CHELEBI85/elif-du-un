import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-ivory px-6 text-center">
      <p className="eyebrow">404</p>
      <div className="rule-gold my-6 w-16" />
      <h1 className="text-display-sm text-ink">Sayfa bulunamadı</h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
        Aradığınız sayfa taşınmış veya süresi dolmuş olabilir. QR kodu tekrar okutmayı
        deneyebilirsiniz.
      </p>
      <Button asChild variant="outline" size="lg" className="mt-8">
        <Link href="/">Ana sayfaya dön</Link>
      </Button>
    </main>
  )
}
