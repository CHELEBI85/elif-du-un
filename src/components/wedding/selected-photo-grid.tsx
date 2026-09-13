'use client'

import { memo, useEffect, useRef, useState } from 'react'
import { ImageIcon, X } from 'lucide-react'
import { requestThumbnail } from '@/lib/client/thumbnail'
import type { SelectedPhoto } from './types'

interface SelectedPhotoGridProps {
  photos: SelectedPhoto[]
  onRemove: (id: string) => void
  disabled?: boolean
}

/**
 * Önizleme karosu. Küçük görsel yalnızca karo ekrana yaklaştığında üretilir;
 * 300 fotoğraf seçildiğinde kaydırılmayan karolar için hiç iş yapılmaz.
 */
const PhotoTile = memo(function PhotoTile({
  photo,
  index,
  onRemove,
  disabled,
}: {
  photo: SelectedPhoto
  index: number
  onRemove: (id: string) => void
  disabled?: boolean
}) {
  const ref = useRef<HTMLLIElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    let cancel: (() => void) | null = null
    let created: string | null = null

    const start = () => {
      if (cancel) return
      cancel = requestThumbnail(photo.file, (result) => {
        if (result) {
          created = result
          setUrl(result)
        } else {
          setFailed(true)
        }
      })
    }

    let observer: IntersectionObserver | null = null
    if (typeof IntersectionObserver === 'undefined') {
      start()
    } else {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]?.isIntersecting) {
            start()
            observer?.disconnect()
          }
        },
        { rootMargin: '300px' },
      )
      observer.observe(node)
    }

    return () => {
      observer?.disconnect()
      cancel?.()
      if (created) URL.revokeObjectURL(created)
    }
  }, [photo.file])

  return (
    <li
      ref={ref}
      className="group relative animate-scale-in overflow-hidden rounded-md border border-line bg-sand"
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <div className="relative flex aspect-square items-center justify-center">
        {url ? (
          // Küçük blob önizleme — Next/Image optimizasyonu burada anlamsız.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={photo.name}
            className="absolute inset-0 size-full animate-fade-in object-cover"
          />
        ) : failed ? (
          <ImageIcon className="size-5 text-faint" aria-label={photo.name} />
        ) : (
          <span aria-hidden="true" className="absolute inset-0 animate-shimmer bg-linen" />
        )}
      </div>

      {!disabled && (
        <button
          type="button"
          onClick={() => onRemove(photo.id)}
          aria-label={`${photo.name} fotoğrafını kaldır`}
          className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-ink/70 text-ivory backdrop-blur-sm transition-colors hover:bg-ink"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      )}
    </li>
  )
})

export function SelectedPhotoGrid({ photos, onRemove, disabled }: SelectedPhotoGridProps) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
      {photos.map((photo, index) => (
        <PhotoTile
          key={photo.id}
          photo={photo}
          index={index}
          onRemove={onRemove}
          disabled={disabled}
        />
      ))}
    </ul>
  )
}
