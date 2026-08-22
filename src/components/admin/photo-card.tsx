'use client'

import { Check, Download, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { GalleryPhoto } from '@/lib/photos'

interface PhotoCardProps {
  photo: GalleryPhoto
  index: number
  selected: boolean
  selectionMode: boolean
  onOpen: (index: number) => void
  onToggleSelect: (id: string) => void
  onDelete: (photo: GalleryPhoto) => void
}

export function PhotoCard({
  photo,
  index,
  selected,
  selectionMode,
  onOpen,
  onToggleSelect,
  onDelete,
}: PhotoCardProps) {
  const label = photo.originalFilename ?? 'Misafir fotoğrafı'

  return (
    <li className="group relative">
      <button
        type="button"
        onClick={() => (selectionMode ? onToggleSelect(photo.id) : onOpen(index))}
        aria-label={selectionMode ? `${label} seç` : `${label} önizlemesini aç`}
        aria-pressed={selectionMode ? selected : undefined}
        className={cn(
          'block w-full overflow-hidden rounded-md border bg-sand transition-all',
          selected ? 'border-gold ring-2 ring-gold/40' : 'border-line hover:border-line-strong',
        )}
      >
        {/*
          Izgarada yalnızca küçük önizlemeler yüklenir; orijinal dosyalar
          hiçbir zaman istenmez. Bu, Cloudinary bant genişliğini düşük tutar.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.thumbnailUrl}
          alt={label}
          loading="lazy"
          decoding="async"
          width={480}
          height={480}
          className={cn(
            'aspect-square w-full object-cover transition-transform duration-300',
            !selectionMode && 'group-hover:scale-[1.03]',
          )}
        />
      </button>

      {/* Seçim kutusu: seçim modunda hep görünür, masaüstünde üzerine gelince belirir. */}
      <button
        type="button"
        onClick={() => onToggleSelect(photo.id)}
        aria-label={selected ? `${label} seçimini kaldır` : `${label} seç`}
        aria-pressed={selected}
        className={cn(
          'absolute left-2 top-2 flex size-6 items-center justify-center rounded-full border transition-all',
          selected
            ? 'border-gold bg-gold text-white opacity-100'
            : 'border-white/70 bg-ink/35 text-transparent backdrop-blur-sm',
          selectionMode ? 'opacity-100' : 'opacity-0 focus-visible:opacity-100 group-hover:opacity-100',
        )}
      >
        <Check className="size-3.5" aria-hidden="true" />
      </button>

      {!selectionMode ? (
        <div className="pointer-events-none absolute right-2 top-2 flex gap-1.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <a
            href={photo.downloadUrl}
            download
            onClick={(e) => e.stopPropagation()}
            aria-label={`${label} indir`}
            className="pointer-events-auto flex size-7 items-center justify-center rounded-full bg-ink/60 text-ivory backdrop-blur-sm transition-colors hover:bg-ink"
          >
            <Download className="size-3.5" aria-hidden="true" />
          </a>
          <button
            type="button"
            onClick={() => onDelete(photo)}
            aria-label={`${label} sil`}
            className="pointer-events-auto flex size-7 items-center justify-center rounded-full bg-ink/60 text-ivory backdrop-blur-sm transition-colors hover:bg-danger"
          >
            <Trash2 className="size-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </li>
  )
}
