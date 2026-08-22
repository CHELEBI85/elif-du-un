import { cn } from '@/lib/utils'

/**
 * Davetiye gravürlerinden ödünç alınmış ince ayraç:
 * iki hairline arasında küçük bir eşkenar dörtgen.
 * Kalp/çiçek gibi klişelere düşmeden "düğün" hissi verir.
 *
 * `animated` verilirse çizgiler ortadaki elmastan dışa doğru açılır.
 * Varsayılan kapalı — QR kartı gibi basılan yüzeylerde hareket istemiyoruz.
 */
export function Ornament({
  className,
  width = 'w-24',
  animated = false,
}: {
  className?: string
  width?: string
  animated?: boolean
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('flex items-center justify-center gap-3', width, className)}
    >
      <span
        className={cn(
          'h-px flex-1 bg-gradient-to-r from-transparent to-gold/70',
          animated && 'origin-right animate-rule',
        )}
      />
      <span className={cn('size-1 rotate-45 bg-gold/80', animated && 'animate-scale-in')} />
      <span
        className={cn(
          'h-px flex-1 bg-gradient-to-l from-transparent to-gold/70',
          animated && 'origin-left animate-rule',
        )}
      />
    </div>
  )
}

/**
 * İki ismi ayıran "&" işareti.
 * Her iki yanında hairline ile birlikte, tipografik bir aks oluşturur.
 */
export function Ampersand() {
  return (
    <span aria-hidden="true" className="flex w-full items-center justify-center gap-4 py-1 sm:gap-5">
      <span className="h-px w-10 origin-right animate-rule bg-gradient-to-r from-transparent to-gold/60 sm:w-16" />
      <span className="font-serif text-3xl font-light italic leading-none text-gold-deep sm:text-4xl">
        &amp;
      </span>
      <span className="h-px w-10 origin-left animate-rule bg-gradient-to-l from-transparent to-gold/60 sm:w-16" />
    </span>
  )
}
