import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans font-medium',
    // 200ms geçiş: anlık değişim sert, 300ms üstü yavaş hissettiriyor.
    'transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]',
    'disabled:pointer-events-none disabled:opacity-50',
    '[&_svg]:pointer-events-none [&_svg]:shrink-0',
    // Basılı hissi: hafif çökme + gölgenin toplanması.
    'active:translate-y-px active:shadow-press',
    'select-none',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-ink text-ivory shadow-soft hover:-translate-y-px hover:bg-ink-soft hover:shadow-lift',
        gold: 'bg-gold text-white shadow-soft hover:-translate-y-px hover:bg-gold-deep hover:shadow-lift',
        outline:
          'border border-line-strong bg-ivory/60 text-ink hover:border-gold hover:bg-sand',
        subtle: 'bg-sand text-ink hover:bg-linen',
        ghost: 'bg-transparent text-muted hover:bg-sand hover:text-ink',
        danger: 'bg-danger text-white shadow-soft hover:brightness-95',
        dangerGhost: 'bg-transparent text-danger hover:bg-danger-wash',
        link: 'bg-transparent text-ink underline underline-offset-4 hover:text-gold-deep',
      },
      size: {
        // Dokunma hedefleri mobilde en az 44px yüksekliğinde tutulur.
        sm: 'h-9 rounded-sm px-3 text-sm [&_svg]:size-4',
        md: 'h-11 rounded-md px-5 text-sm [&_svg]:size-4',
        lg: 'h-14 rounded-lg px-8 text-[0.9375rem] tracking-wide [&_svg]:size-[1.125rem]',
        xl: 'h-16 rounded-lg px-10 text-base tracking-wide [&_svg]:size-5',
        icon: 'size-11 rounded-md [&_svg]:size-4',
        iconSm: 'size-9 rounded-sm [&_svg]:size-4',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        type={asChild ? undefined : (type ?? 'button')}
        {...props}
      />
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
