'use client'

import { AlertCircle, Check } from 'lucide-react'
import { messages } from '@/lib/messages'
import type { SelectedPhoto } from './types'

interface UploadProgressProps {
  photos: SelectedPhoto[]
}

/** Dosya başına ilerleme + toplam sayaç. */
export function UploadProgress({ photos }: UploadProgressProps) {
  const done = photos.filter((p) => p.status === 'done').length
  const total = photos.length
  const overall = total === 0 ? 0 : Math.round((done / total) * 100)

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
          className="h-1 w-full overflow-hidden rounded-full bg-sand"
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

      <ul className="no-scrollbar flex max-h-72 flex-col gap-3 overflow-y-auto">
        {photos.map((photo) => (
          <li key={photo.id} className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-xs text-ink-soft">{photo.name}</p>
                {photo.status === 'done' ? (
                  <Check className="size-3.5 shrink-0 text-success" aria-label="Yüklendi" />
                ) : photo.status === 'error' ? (
                  <AlertCircle className="size-3.5 shrink-0 text-danger" aria-label="Başarısız" />
                ) : (
                  <span className="shrink-0 text-[0.6875rem] tabular-nums text-faint">
                    {photo.progress}%
                  </span>
                )}
              </div>
              <div className="mt-1.5 h-[3px] w-full overflow-hidden rounded-full bg-sand">
                <div
                  className={
                    photo.status === 'error'
                      ? 'h-full rounded-full bg-danger'
                      : photo.status === 'done'
                        ? 'h-full rounded-full bg-success'
                        : 'h-full rounded-full bg-gold transition-[width] duration-300 ease-out'
                  }
                  style={{ width: `${photo.status === 'error' ? 100 : photo.progress}%` }}
                />
              </div>
              {photo.status === 'error' && photo.error ? (
                <p className="mt-1 text-[0.6875rem] leading-snug text-danger">{photo.error}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
