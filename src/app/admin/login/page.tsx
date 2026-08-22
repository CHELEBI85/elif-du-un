import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Ornament } from '@/components/wedding/ornament'
import { LoginForm } from './login-form'

export const metadata: Metadata = { title: 'Yönetim Paneli' }
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ next?: string; error?: string }>
}

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await getSession()
  if (session) redirect('/admin')

  const { next, error } = await searchParams

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-cream px-6 py-12">
      <div aria-hidden="true" className="vignette-warm absolute inset-0" />
      <div aria-hidden="true" className="paper-grain absolute inset-0 opacity-70" />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="flex flex-col items-center text-center">
          <p className="eyebrow">Düğün Anıları</p>
          <Ornament className="mt-6" width="w-20" />
          <h1 className="mt-7 font-serif text-4xl font-light text-ink">Elif &amp; Yunus Emre</h1>
          <p className="mt-3 text-sm text-muted">Yönetim Paneli</p>
        </div>

        <div className="mt-10 rounded-lg border border-line bg-ivory p-6 shadow-soft sm:p-8">
          <LoginForm
            next={next}
            initialError={
              error === 'config'
                ? 'Sunucu yapılandırması eksik. Lütfen yöneticinize başvurun.'
                : undefined
            }
          />
        </div>

        <p className="mt-8 text-center text-xs text-muted">
          Bu alan yalnızca etkinlik sahipleri içindir.
        </p>
      </div>
    </main>
  )
}
