'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CalendarHeart, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/admin', label: 'Genel Bakış', icon: LayoutDashboard, exact: true },
  { href: '/admin/events', label: 'Etkinlikler', icon: CalendarHeart, exact: false },
] as const

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav aria-label="Yönetim menüsü">
      <ul className="flex gap-1 lg:flex-col">
        {links.map((link) => {
          const active = link.exact ? pathname === link.href : pathname.startsWith(link.href)
          const Icon = link.icon
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                  active ? 'bg-gold-wash text-gold-deep' : 'text-muted hover:bg-sand hover:text-ink',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span>{link.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
