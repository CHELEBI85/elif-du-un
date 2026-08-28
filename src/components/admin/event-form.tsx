'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AlertCircle, AlertTriangle, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Field, Input, Label } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@/components/ui/spinner'
import { slugify, toDateInputValue } from '@/lib/format'
import { DEFAULT_RETENTION_DAYS } from '@/lib/constants'
import type { EventFormState } from '@/app/admin/(panel)/events/actions'

type FormAction = (state: EventFormState, formData: FormData) => Promise<EventFormState>

interface EventFormProps {
  action: FormAction
  submitLabel: string
  appUrl: string
  event?: {
    id: string
    coupleName: string
    title: string
    brideName: string
    groomName: string
    slug: string
    eventDate: Date | null
    retentionDays: number
    uploadEnabled: boolean
    /** Boşsa süresiz saklama açıktır. */
    expiresAt: Date | null
  }
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="primary" size="lg" disabled={pending}>
      {pending ? <Spinner label="Kaydediliyor…" /> : label}
    </Button>
  )
}

export function EventForm({ action, submitLabel, appUrl, event }: EventFormProps) {
  const [state, formAction] = useActionState<EventFormState, FormData>(action, {})

  const [brideName, setBrideName] = useState(event?.brideName ?? '')
  const [groomName, setGroomName] = useState(event?.groomName ?? '')
  const [slug, setSlug] = useState(event?.slug ?? '')
  const [slugTouched, setSlugTouched] = useState(Boolean(event))
  const [uploadEnabled, setUploadEnabled] = useState(event?.uploadEnabled ?? true)
  // expiresAt boşsa etkinlik süresiz saklanıyor demektir.
  const [unlimitedRetention, setUnlimitedRetention] = useState(
    event ? event.expiresAt === null : false,
  )

  const originalSlug = event?.slug
  const slugChanged = Boolean(originalSlug && slug !== originalSlug)

  /** Slug elle düzenlenmediyse gelin ve damat adından otomatik türetilir. */
  const syncSlug = (bride: string, groom: string) => {
    if (slugTouched) return
    const combined = [bride, groom].filter(Boolean).join(' ')
    setSlug(slugify(combined))
  }

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-8">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}

      {state.error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger/25 bg-danger-wash px-4 py-3 text-sm leading-relaxed text-danger"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.error}</span>
        </p>
      ) : null}

      {state.success ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-md border border-success/25 bg-[#eaf1ec] px-4 py-3 text-sm leading-relaxed text-success"
        >
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{state.success}</span>
        </p>
      ) : null}

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 font-serif text-xl text-ink">Çift bilgileri</legend>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Gelin adı (tam)"
            htmlFor="brideName"
            error={state.fieldErrors?.brideName}
            hint="Veritabanında saklanır, yönetim panelinde görünür."
          >
            <Input
              id="brideName"
              name="brideName"
              required
              value={brideName}
              onChange={(e) => {
                setBrideName(e.target.value)
                syncSlug(e.target.value, groomName)
              }}
              placeholder="Elif Aydın"
            />
          </Field>

          <Field
            label="Damat adı (tam)"
            htmlFor="groomName"
            error={state.fieldErrors?.groomName}
            hint="Veritabanında saklanır, yönetim panelinde görünür."
          >
            <Input
              id="groomName"
              name="groomName"
              required
              value={groomName}
              onChange={(e) => {
                setGroomName(e.target.value)
                syncSlug(brideName, e.target.value)
              }}
              placeholder="Yunus Emre Kapukaya"
            />
          </Field>
        </div>

        <Field
          label="Herkese açık çift adı"
          htmlFor="coupleName"
          error={state.fieldErrors?.coupleName}
          hint='Misafirlerin gördüğü isim. "&" işareti iki ismi ayırır.'
        >
          <Input
            id="coupleName"
            name="coupleName"
            required
            defaultValue={event?.coupleName ?? ''}
            placeholder="Elif & Yunus Emre"
          />
        </Field>

        <Field
          label="Yönetim başlığı"
          htmlFor="title"
          error={state.fieldErrors?.title}
          hint="Yalnızca yönetim panelinde kullanılır."
        >
          <Input
            id="title"
            name="title"
            required
            defaultValue={event?.title ?? ''}
            placeholder="Elif Aydın & Yunus Emre Kapukaya"
          />
        </Field>
      </fieldset>

      <fieldset className="flex flex-col gap-5">
        <legend className="mb-1 font-serif text-xl text-ink">Bağlantı ve tarih</legend>

        <Field
          label="Bağlantı adresi"
          htmlFor="slug"
          error={state.fieldErrors?.slug}
          hint={
            <>
              QR kodu şu adrese yönlendirir:{' '}
              <span className="break-all text-ink-soft">
                {appUrl}/w/{slug || 'baglanti-adresi'}
              </span>
            </>
          }
        >
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlugTouched(true)
              setSlug(slugify(e.target.value))
            }}
            placeholder="elif-aydin-yunus-emre-kapukaya"
          />
        </Field>

        {slugChanged ? (
          <p
            role="alert"
            className="flex items-start gap-2 rounded-md border border-gold/40 bg-gold-wash px-4 py-3 text-sm leading-relaxed text-gold-deep"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>
              Bağlantı adresini değiştiriyorsun. Daha önce bastırdığın QR kodları artık
              çalışmayacak — kaydettikten sonra QR kodunu yeniden indirip yazdırman gerekir.
            </span>
          </p>
        ) : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Düğün tarihi"
            htmlFor="eventDate"
            error={state.fieldErrors?.eventDate}
            hint="Boş bırakılabilir. Saklama süresi bu tarihten itibaren sayılır."
          >
            <Input
              id="eventDate"
              name="eventDate"
              type="date"
              defaultValue={toDateInputValue(event?.eventDate)}
            />
          </Field>

          <Field
            label="Saklama süresi (gün)"
            htmlFor="retentionDays"
            error={state.fieldErrors?.retentionDays}
            hint={
              unlimitedRetention
                ? 'Süresiz saklama açıkken bu değer kullanılmaz.'
                : 'Süre dolunca fotoğraflar otomatik olarak silinir.'
            }
          >
            <Input
              id="retentionDays"
              name="retentionDays"
              type="number"
              min={1}
              max={365}
              required
              /*
                DIKKAT: disabled KULLANMA. Devre disi input'lar form verisine
                dahil edilmez; sunucu retentionDays'i bos gorup dogrulamada
                takilir ve kayit hic yapilmaz. readOnly ile deger gonderilmeye
                devam eder, boylece sureli moda donuldugunde eski gun sayisi korunur.
              */
              readOnly={unlimitedRetention}
              aria-disabled={unlimitedRetention}
              defaultValue={event?.retentionDays ?? DEFAULT_RETENTION_DAYS}
            />
          </Field>
        </div>

        <div className="flex items-start justify-between gap-6 rounded-md border border-line bg-ivory p-4">
          <div>
            <Label htmlFor="unlimitedRetention">Süresiz sakla</Label>
            <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">
              Açıkken fotoğraflar hiçbir zaman otomatik silinmez ve yükleme kapanmaz.
              Fotoğrafları dilediğin zaman galeriden kendin silebilirsin.
            </p>
          </div>
          <Switch
            id="unlimitedRetention"
            name="unlimitedRetention"
            checked={unlimitedRetention}
            onCheckedChange={setUnlimitedRetention}
          />
        </div>

        <div className="flex items-start justify-between gap-6 rounded-md border border-line bg-ivory p-4">
          <div>
            <Label htmlFor="uploadEnabled">Fotoğraf yükleme açık</Label>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Kapatırsan misafirler sayfayı görür ama yeni fotoğraf gönderemez.
            </p>
          </div>
          <Switch
            id="uploadEnabled"
            name="uploadEnabled"
            checked={uploadEnabled}
            onCheckedChange={setUploadEnabled}
          />
        </div>
      </fieldset>

      <div className="flex gap-3">
        <SubmitButton label={submitLabel} />
      </div>
    </form>
  )
}
