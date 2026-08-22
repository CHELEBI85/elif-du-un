import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  hint?: string
  icon?: React.ReactNode
  tone?: 'default' | 'gold' | 'warning'
}

/**
 * İstatistik kartı. Üstteki ince altın çizgi kartlara editoryal bir künye
 * hissi veriyor ve panelin herkese açık sayfayla aynı dili konuşmasını sağlıyor.
 */
export function StatCard({ label, value, hint, icon, tone = 'default' }: StatCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-line bg-ivory p-5 shadow-soft transition-shadow duration-200 hover:shadow-lift">
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 top-0 h-px',
          tone === 'gold' && 'bg-gradient-to-r from-transparent via-gold to-transparent',
          tone === 'warning' && 'bg-gradient-to-r from-transparent via-danger/60 to-transparent',
          tone === 'default' && 'bg-gradient-to-r from-transparent via-line-strong to-transparent',
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.14em] text-muted">
          {label}
        </p>
        {icon ? <span className="shrink-0 text-faint">{icon}</span> : null}
      </div>

      <p
        className={cn(
          'mt-3.5 font-serif text-[2rem] font-normal leading-none tabular-nums',
          tone === 'gold' && 'text-gold-deep',
          tone === 'warning' && 'text-danger',
          tone === 'default' && 'text-ink',
        )}
      >
        {value}
      </p>

      {hint ? <p className="mt-2.5 text-xs leading-relaxed text-muted">{hint}</p> : null}
    </div>
  )
}
