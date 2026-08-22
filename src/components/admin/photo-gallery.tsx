'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckSquare, Images, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from './empty-state'
import { PhotoCard } from './photo-card'
import { PhotoLightbox } from './photo-lightbox'
import { DeletePhotosDialog } from './delete-photos-dialog'
import { formatCount } from '@/lib/format'
import { messages } from '@/lib/messages'
import type { GalleryPhoto, PhotoPage } from '@/lib/photos'

interface PhotoGalleryProps {
  eventId: string
  initialPage: PhotoPage
}

type DeleteTarget = { kind: 'single'; photo: GalleryPhoto } | { kind: 'bulk' }

export function PhotoGallery({ eventId, initialPage }: PhotoGalleryProps) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPage.items)
  const [cursor, setCursor] = useState<string | null>(initialPage.nextCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !cursor) return
    loadingRef.current = true
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/events/${eventId}/photos?cursor=${encodeURIComponent(cursor)}&limit=48`,
      )
      if (!response.ok) throw new Error('failed')
      const page = (await response.json()) as PhotoPage
      setPhotos((prev) => [...prev, ...page.items])
      setCursor(page.nextCursor)
    } catch {
      setError(messages.errors.server)
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [cursor, eventId])

  // Sonsuz kaydırma: binlerce görsel asla tek seferde çekilmez.
  useEffect(() => {
    const node = sentinelRef.current
    if (!node || !cursor) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: '600px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [cursor, loadMore])

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectAll = useCallback(() => {
    setSelected(new Set(photos.map((p) => p.id)))
    setSelectionMode(true)
  }, [photos])

  const clearSelection = useCallback(() => {
    setSelected(new Set())
    setSelectionMode(false)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const ids =
      deleteTarget.kind === 'single' ? [deleteTarget.photo.id] : Array.from(selected)
    if (ids.length === 0) return

    setDeleting(true)
    setError(null)
    try {
      const response =
        ids.length === 1 && ids[0]
          ? await fetch(`/api/photos/${ids[0]}`, { method: 'DELETE' })
          : await fetch('/api/photos/bulk-delete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ photoIds: ids }),
            })

      if (!response.ok) throw new Error('failed')

      const removed = new Set(ids)
      setPhotos((prev) => prev.filter((p) => !removed.has(p.id)))
      setSelected((prev) => {
        const next = new Set(prev)
        for (const id of ids) next.delete(id)
        return next
      })
      setLightboxIndex(null)
      setDeleteTarget(null)
    } catch {
      setError(messages.errors.server)
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, selected])

  // Toplu indirme: her fotoğraf için ayrı bir indirme sekmesi açmak yerine
  // tarayıcıyı sırayla tetikliyoruz; hiçbir dosya belleğe alınmaz.
  const downloadSelected = useCallback(() => {
    const targets = photos.filter((p) => selected.has(p.id))
    targets.forEach((photo, i) => {
      window.setTimeout(() => {
        const link = document.createElement('a')
        link.href = photo.downloadUrl
        link.download = photo.originalFilename ?? `${photo.id}.${photo.format}`
        document.body.appendChild(link)
        link.click()
        link.remove()
      }, i * 350)
    })
  }, [photos, selected])

  if (photos.length === 0) {
    return (
      <EmptyState
        icon={<Images className="size-5" aria-hidden="true" />}
        title="Henüz fotoğraf yok"
        description="Misafirlerin fotoğraf yüklediğinde burada görebileceksin."
      />
    )
  }

  const selectedCount = selected.size

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="tabular-nums">{formatCount(photos.length)}</span> fotoğraf yüklendi
          {cursor ? ' (daha fazlası var)' : ''}
        </p>

        <div className="flex gap-2">
          <Button
            variant={selectionMode ? 'subtle' : 'ghost'}
            size="sm"
            onClick={() => (selectionMode ? clearSelection() : setSelectionMode(true))}
          >
            {selectionMode ? (
              <CheckSquare aria-hidden="true" />
            ) : (
              <Square aria-hidden="true" />
            )}
            {selectionMode ? 'Seçimi kapat' : 'Seç'}
          </Button>
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Tümünü Seç
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mb-5 rounded-md bg-danger-wash px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 sm:gap-3">
        {photos.map((photo, index) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            index={index}
            selected={selected.has(photo.id)}
            selectionMode={selectionMode}
            onOpen={setLightboxIndex}
            onToggleSelect={toggleSelect}
            onDelete={(target) => setDeleteTarget({ kind: 'single', photo: target })}
          />
        ))}

        {loading
          ? Array.from({ length: 6 }, (_, i) => (
              <li key={`skeleton-${i}`}>
                <Skeleton className="aspect-square w-full" />
              </li>
            ))
          : null}
      </ul>

      {cursor ? (
        <div ref={sentinelRef} className="flex justify-center py-10">
          {loading ? (
            <Spinner className="text-gold" label="Fotoğraflar yükleniyor…" />
          ) : (
            <Button variant="outline" size="md" onClick={() => void loadMore()}>
              Daha fazla yükle
            </Button>
          )}
        </div>
      ) : (
        <p className="py-10 text-center text-xs text-faint">Tüm fotoğraflar yüklendi.</p>
      )}

      {/* Bağlamsal toplu işlem çubuğu */}
      {selectedCount > 0 ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4">
          <div className="pointer-events-auto flex w-full max-w-xl animate-fade-up items-center gap-3 rounded-lg border border-line bg-ivory px-4 py-3 shadow-lift">
            <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
              {formatCount(selectedCount)} fotoğraf seçildi
            </p>
            <Button variant="subtle" size="sm" onClick={downloadSelected}>
              İndir
            </Button>
            <Button
              variant="dangerGhost"
              size="sm"
              onClick={() => setDeleteTarget({ kind: 'bulk' })}
            >
              Sil
            </Button>
            <Button variant="ghost" size="iconSm" onClick={clearSelection} aria-label="Seçimi kaldır">
              <X aria-hidden="true" />
            </Button>
          </div>
        </div>
      ) : null}

      {lightboxIndex !== null ? (
        <PhotoLightbox
          photos={photos}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onDelete={(photo) => setDeleteTarget({ kind: 'single', photo })}
        />
      ) : null}

      <DeletePhotosDialog
        open={deleteTarget !== null}
        count={deleteTarget?.kind === 'bulk' ? selectedCount : 1}
        pending={deleting}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
