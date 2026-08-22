import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  backHref?: string
  backLabel?: string
  actions?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  backHref,
  backLabel = 'Geri',
  actions,
}: PageHeaderProps) {
  return (
    <div className="print-hidden mb-8 border-b border-line pb-6 sm:mb-10 sm:pb-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {backHref ? (
            <Link
              href={backHref}
              className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-ink"
            >
              <ChevronLeft className="size-3.5" aria-hidden="true" />
              {backLabel}
            </Link>
          ) : null}
          <h1 className="font-serif text-3xl font-light leading-tight text-ink sm:text-[2.5rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  )
}
