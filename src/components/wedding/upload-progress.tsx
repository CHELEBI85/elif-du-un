'use client'

import { AlertCircle, Smartphone } from 'lucide-react'
import { messages } from '@/lib/messages'
import type { SelectedPhoto } from './types'

interface UploadProgressProps {
  photos: SelectedPhoto[]
}

/**
 * Toplam ilerleme + yalnızca şu an işlenen ve başarısız olan fotoğraflar.
 *
 * 300 fotoğrafın hepsini satır satır çizmek hem telefonu yorar hem de
 * okunmaz; sırada bekleyenler ve bitenler toplam sayaçta görünür.
 */
export function UploadProgress({ photos }: UploadProgressProps) {
  const total = photos.length
  const done = photos.filter((p) => p.status === 'done').length
  const active = photos.filter((p) => p.status === 'uploading')
  const failed = photos.filter((p) => p.status === 'error')

  // Genel çubuk: bitenler + işlenenlerin kısmi ilerlemesi.
  const partial = active.reduce((sum, p) => sum + p.progress / 100, 0)
  const overall = total === 0 ? 0 : Math.round(((done + partial) / total) * 100)

  return (
    <section aria-label="Yükleme durumu" className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl font-normal text-ink">Fotoğraflar yükleniyor</h2>
          <p
            className="text-sm tabular-nums text-muted"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {messages.upload.progress(done, total)}
          </p>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-sand"
          role="progressbar"
          aria-valuenow={overall}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Toplam yükleme ilerlemesi"
        >
          <div
            className="h-full rounded-full bg-gold transition-[width] duration-500 ease-out"
            style={{ width: `${overall}%` }}
          />
        </div>
      </div>

      {total > 5 ? (
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted">
          <Smartphone className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{messages.upload.keepOpen}</span>
        </p>
      ) : null}

      <ul className="flex flex-col gap-3">
        {active.map((photo) => (
          <li key={photo.id} className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-xs text-ink-soft">{photo.name}</p>
              <span className="shrink-0 text-[0.6875rem] tabular-nums text-muted">
                {photo.progress === 0 ? 'hazırlanıyor' : `${photo.progress}%`}
              </span>
            </div>
            <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-gold transition-[width] duration-300 ease-out"
                style={{ width: `${photo.progress}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      {failed.length > 0 ? (
        <p className="flex items-center gap-2 text-xs text-danger">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {failed.length} fotoğraf yüklenemedi — bitince tekrar deneyebilirsin.
        </p>
      ) : null}
    </section>
  )
}
