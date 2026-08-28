'use server'

import { redirect } from 'next/navigation'
import { signIn, signOut } from '@/lib/auth'
import { loginSchema } from '@/lib/validation'
import { clientIp, rateLimit } from '@/lib/rate-limit'
import { messages } from '@/lib/messages'
import { headers } from 'next/headers'

export interface LoginState {
  error?: string
}

/** Yönetici girişi. Kaba kuvvet denemelerine karşı IP başına sınırlıdır. */
export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const ip = clientIp(await headers())
  const limit = rateLimit(`login:${ip}`, 8, 5 * 60_000)
  if (!limit.ok) {
    return { error: 'Çok fazla deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.' }
  }

  const parsed = loginSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? messages.errors.server }
  }

  const session = await signIn(parsed.data.username, parsed.data.password)
  if (!session) return { error: messages.errors.invalidCredentials }

  const next = formData.get('next')
  const target = typeof next === 'string' && next.startsWith('/admin') ? next : '/admin'
  redirect(target)
}

export async function logoutAction(): Promise<void> {
  await signOut()
  redirect('/admin/login')
}
