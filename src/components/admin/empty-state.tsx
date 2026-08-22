interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-line-strong bg-ivory px-6 py-16 text-center">
      {icon ? (
        <span className="mb-5 flex size-12 items-center justify-center rounded-full bg-sand text-muted">
          {icon}
        </span>
      ) : null}
      <h3 className="font-serif text-xl font-medium text-ink">{title}</h3>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  )
}
