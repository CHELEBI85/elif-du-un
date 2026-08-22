'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Trash2, X } from 'lucide-react'
import { formatBytes, formatDateTime } from '@/lib/format'
import type { GalleryPhoto } from '@/lib/photos'

interface PhotoLightboxProps {
  photos: GalleryPhoto[]
  index: number
  onClose: () => void
  onNavigate: (index: number) => void
  onDelete: (photo: GalleryPhoto) => void
}

/** Kaydırma hareketinin sayfa değiştirmesi için gereken en küçük mesafe. */
const SWIPE_THRESHOLD = 60

export function PhotoLightbox({
  photos,
  index,
  onClose,
  onNavigate,
  onDelete,
}: PhotoLightboxProps) {
  const photo = photos[index]
  const closeRef = useRef<HTMLButtonElement>(null)
  const touchStartX = useRef<number | null>(null)

  /*
    Yüklenme durumunu boolean yerine "hangi fotoğraf yüklendi" olarak tutuyoruz.
    Böylece fotoğraf değişince durumu sıfırlamak için efekt gerekmiyor —
    değer doğrudan mevcut fotoğraftan türetiliyor.
  */
  const [loadedId, setLoadedId] = useState<string | null>(null)
  const loaded = photo !== undefined && loadedId === photo.id

  const goPrev = useCallback(() => {
    if (index > 0) onNavigate(index - 1)
  }, [index, onNavigate])

  const goNext = useCallback(() => {
    if (index < photos.length - 1) onNavigate(index + 1)
  }, [index, photos.length, onNavigate])

  // Klavye desteği: Esc kapatır, oklar gezinir.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      else if (event.key === 'ArrowLeft') goPrev()
      else if (event.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, goPrev, goNext])

  // Arkadaki sayfanın kaymasını engelle ve odağı içeri al.
  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = previous
    }
  }, [])

  if (!photo) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fotoğraf önizleme"
      className="fixed inset-0 z-50 flex animate-fade-in flex-col bg-ink/95"
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current
        const end = e.changedTouches[0]?.clientX
        touchStartX.current = null
        if (start === null || end === undefined) return
        const delta = end - start
        if (delta > SWIPE_THRESHOLD) goPrev()
        else if (delta < -SWIPE_THRESHOLD) goNext()
      }}
    >
      <header className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <p className="min-w-0 truncate text-sm text-ivory/80">
          <span className="tabular-nums">
            {index + 1} / {photos.length}
          </span>
          {photo.originalFilename ? (
            <span className="ml-3 hidden sm:inline">{photo.originalFilename}</span>
          ) : null}
        </p>

        <div className="flex shrink-0 items-center gap-1.5">
          <a
            href={photo.downloadUrl}
            download
            aria-label="Fotoğrafı indir"
            className="flex size-10 items-center justify-center rounded-full text-ivory/80 transition-colors hover:bg-ivory/10 hover:text-ivory"
          >
            <Download className="size-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => onDelete(photo)}
            aria-label="Fotoğrafı sil"
            className="flex size-10 items-center justify-center rounded-full text-ivory/80 transition-colors hover:bg-danger/80 hover:text-ivory"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="flex size-10 items-center justify-center rounded-full text-ivory/80 transition-colors hover:bg-ivory/10 hover:text-ivory"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 pb-2 sm:px-16">
        {index > 0 ? (
          <button
            type="button"
            onClick={goPrev}
            aria-label="Önceki fotoğraf"
            className="absolute left-2 z-10 hidden size-12 items-center justify-center rounded-full bg-ivory/10 text-ivory transition-colors hover:bg-ivory/20 sm:flex"
          >
            <ChevronLeft className="size-6" aria-hidden="true" />
          </button>
        ) : null}

        {!loaded ? (
          <div
            aria-hidden="true"
            className="absolute size-10 animate-spin rounded-full border-2 border-ivory/20 border-t-ivory/70"
          />
        ) : null}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={photo.id}
          src={photo.previewUrl}
          alt={photo.originalFilename ?? 'Misafir fotoğrafı'}
          onLoad={() => setLoadedId(photo.id)}
          className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {index < photos.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            aria-label="Sonraki fotoğraf"
            className="absolute right-2 z-10 hidden size-12 items-center justify-center rounded-full bg-ivory/10 text-ivory transition-colors hover:bg-ivory/20 sm:flex"
          >
            <ChevronRight className="size-6" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <footer className="px-4 py-3 text-center text-xs text-ivory/70 sm:px-6">
        {photo.width} × {photo.height} · {formatBytes(photo.fileSize)} ·{' '}
        {formatDateTime(photo.createdAt)}
      </footer>
    </div>
  )
}
