'use client'

import { useFormStatus } from 'react-dom'
import { LogOut } from 'lucide-react'
import { logoutAction } from '@/app/admin/actions'

function Inner() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="-mx-2 mt-1 flex min-h-9 w-[calc(100%+1rem)] items-center gap-2 rounded-sm px-2 text-xs font-medium text-muted transition-colors hover:bg-sand hover:text-ink disabled:opacity-60"
    >
      <LogOut className="size-3.5 shrink-0" aria-hidden="true" />
      {pending ? 'Çıkılıyor…' : 'Çıkış yap'}
    </button>
  )
}

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <Inner />
    </form>
  )
}
