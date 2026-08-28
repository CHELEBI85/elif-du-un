import Link from 'next/link'
import { AdminNav } from './admin-nav'
import { LogoutButton } from './logout-button'

/**
 * Yönetim paneli kabuğu. Herkese açık düğün sayfasıyla aynı tasarım dilini
 * paylaşır (aynı palet, aynı serif başlıklar) ama daha işlevsel ve yoğundur.
 */
export function AdminShell({ username, children }: { username: string; children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-cream">
      <div className="mx-auto flex max-w-7xl flex-col lg:flex-row">
        <aside className="print-hidden border-b border-line bg-ivory lg:min-h-dvh lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-4 px-5 py-5 lg:flex-col lg:items-stretch lg:gap-9 lg:py-8">
            <Link href="/admin" className="group block">
              <p className="text-[0.5625rem] font-medium uppercase tracking-[0.32em] text-muted">
                Düğün Anıları
              </p>
              <p className="mt-2 font-serif text-xl font-normal leading-tight text-ink transition-colors group-hover:text-gold-deep">
                Elif &amp; Yunus Emre
              </p>
              <span
                aria-hidden="true"
                className="mt-3 hidden h-px w-8 bg-gold/60 transition-all duration-300 group-hover:w-14 lg:block"
              />
            </Link>

            <AdminNav />
          </div>

          <div className="hidden border-t border-line px-5 py-5 lg:block">
            <p className="truncate text-xs text-muted" title={username}>
              {username}
            </p>
            <LogoutButton />
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 sm:py-10">{children}</main>
      </div>
    </div>
  )
}
