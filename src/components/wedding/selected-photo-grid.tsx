'use client'

import Image from 'next/image'
import { X } from 'lucide-react'
import { formatBytes } from '@/lib/format'
import type { SelectedPhoto } from './types'

interface SelectedPhotoGridProps {
  photos: SelectedPhoto[]
  onRemove: (id: string) => void
  disabled?: boolean
}

export function SelectedPhotoGrid({ photos, onRemove, disabled }: SelectedPhotoGridProps) {
  return (
    <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3">
      {photos.map((photo, index) => (
        <li
          key={photo.id}
          className="group relative animate-scale-in overflow-hidden rounded-md border border-line bg-sand"
          style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
        >
          <div className="relative aspect-square">
            <Image
              src={photo.previewUrl}
              alt={photo.name}
              fill
              unoptimized
              sizes="(max-width: 640px) 33vw, 25vw"
              className="object-cover"
            />
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

          <span className="sr-only">{formatBytes(photo.size)}</span>
        </li>
      ))}
    </ul>
  )
}
