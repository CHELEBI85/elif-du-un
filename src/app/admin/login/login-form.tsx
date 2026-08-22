'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { loginAction, type LoginState } from '../actions'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="primary" size="lg" className="w-full" disabled={pending}>
      {pending ? <Spinner label="Giriş yapılıyor…" /> : 'Giriş Yap'}
    </Button>
  )
}

export function LoginForm({ next, initialError }: { next?: string; initialError?: string }) {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {
    error: initialError,
  })

  return (
    <form action={formAction} className="flex flex-col gap-5">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger-wash px-3.5 py-3 text-sm leading-relaxed text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.error}</span>
        </p>
      ) : null}

      <Field label="E-posta" htmlFor="email">
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          placeholder="ornek@eposta.com"
        />
      </Field>

      <Field label="Şifre" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>

      <SubmitButton />
    </form>
  )
}
