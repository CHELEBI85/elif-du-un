'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckSquare, Images, Square, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from './empty-state'
import { PhotoCard } from './photo-card'
import { PhotoLightbox } from './photo-lightbox'
import { DeletePhotosDialog } from './delete-photos-dialog'
import { DELETE_BATCH_SIZE } from '@/lib/constants'
import { formatCount } from '@/lib/format'
import { messages } from '@/lib/messages'
import type { GalleryPhoto, PhotoPage } from '@/lib/photos'

interface PhotoGalleryProps {
  eventId: string
  initialPage: PhotoPage
}

type DeleteTarget = { kind: 'single'; photo: GalleryPhoto } | { kind: 'bulk' }

interface DeleteResponse {
  deletedIds: string[]
  failedIds: string[]
}

/** Tek tek indirilebilecek en fazla seçili fotoğraf; fazlası tarayıcıda engellenir. */
const MAX_INDIVIDUAL_DOWNLOADS = 20
/** Geçici ağ hatasında bir silme parçasının toplam deneme sayısı. */
const DELETE_ATTEMPTS = 3

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Bir silme parçasını geçici hatalara karşı tekrar deneyerek gönderir. */
async function postDeleteChunk(eventId: string, photoIds: string[]): Promise<DeleteResponse | null> {
  for (let attempt = 0; attempt < DELETE_ATTEMPTS; attempt++) {
    try {
      const response = await fetch('/api/photos/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, photoIds }),
      })
      if (response.ok) return (await response.json()) as DeleteResponse
      // 4xx tekrar denemeyle düzelmez (ör. oturum düşmüş).
      if (response.status < 500) return null
    } catch {
      // Ağ hatası: aşağıda bekleyip tekrar dene.
    }
    await sleep(800 * (attempt + 1))
  }
  return null
}

export function PhotoGallery({ eventId, initialPage }: PhotoGalleryProps) {
  const router = useRouter()

  const [photos, setPhotos] = useState<GalleryPhoto[]>(initialPage.items)
  const [cursor, setCursor] = useState<string | null>(initialPage.nextCursor)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectingAll, setSelectingAll] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState<{ done: number; total: number } | null>(
    null,
  )

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
      setPhotos((prev) => {
        // Silme sırasında sayfa sınırları kayabilir; aynı fotoğraf iki kez eklenmesin.
        const seen = new Set(prev.map((p) => p.id))
        return [...prev, ...page.items.filter((p) => !seen.has(p.id))]
      })
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

  /** Yalnızca ekrandakileri değil, etkinlikteki TÜM fotoğrafları seçer. */
  const selectAll = useCallback(async () => {
    setSelectingAll(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/events/${eventId}/photo-ids`)
      if (!response.ok) throw new Error('failed')
      const { ids } = (await response.json()) as { ids: string[] }
      setSelected(new Set(ids))
      setSelectionMode(true)
    } catch {
      setError(messages.errors.server)
    } finally {
      setSelectingAll(false)
    }
  }, [eventId])

  const clearSelection = useCallback(() => {
    setSelected(new Set())
    setSelectionMode(false)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const ids = deleteTarget.kind === 'single' ? [deleteTarget.photo.id] : Array.from(selected)
    if (ids.length === 0) return

    setDeleting(true)
    setError(null)
    setNotice(null)
    setDeleteProgress({ done: 0, total: ids.length })

    const deletedIds: string[] = []
    let failedCount = 0

    if (deleteTarget.kind === 'single') {
      try {
        const response = await fetch(`/api/photos/${ids[0]}`, { method: 'DELETE' })
        if (!response.ok) throw new Error('failed')
        deletedIds.push(...((await response.json()) as DeleteResponse).deletedIds)
      } catch {
        failedCount = 1
      }
    } else {
      // Büyük seçimler parça parça silinir; bir parça başarısız olsa bile
      // diğerleri devam eder, sonunda neyin silinemediği bildirilir.
      for (let i = 0; i < ids.length; i += DELETE_BATCH_SIZE) {
        const chunk = ids.slice(i, i + DELETE_BATCH_SIZE)
        const result = await postDeleteChunk(eventId, chunk)
        if (result) {
          deletedIds.push(...result.deletedIds)
          failedCount += result.failedIds.length
        } else {
          failedCount += chunk.length
        }
        setDeleteProgress({ done: Math.min(i + chunk.length, ids.length), total: ids.length })
      }
    }

    if (deletedIds.length > 0) {
      const removed = new Set(deletedIds)
      const remaining = photos.filter((p) => !removed.has(p.id))

      setPhotos(remaining)
      // Updater içinde yan etki olmasın (StrictMode updater'ı iki kez çağırır).
      const nextSelected = new Set(selected)
      for (const id of removed) nextSelected.delete(id)
      setSelected(nextSelected)
      if (nextSelected.size === 0) setSelectionMode(false)

      // Lightbox'tan silindiyse kapatmak yerine sıradaki fotoğrafa geç.
      if (lightboxIndex !== null) {
        setLightboxIndex(remaining.length === 0 ? null : Math.min(lightboxIndex, remaining.length - 1))
      }

      // Başlıktaki fotoğraf sayısı ve depolama bilgisi güncellensin.
      router.refresh()

      // Ekranda az fotoğraf kaldıysa sonraki sayfayı kaydırmayı beklemeden getir.
      // Hepsi silindiyse bu istek boş döner ve "Henüz fotoğraf yok" gösterilir;
      // yalnızca kaydırma gözlemcisine güvenmek "0 fotoğraf gösteriliyor" diye
      // boş bir ara ekranda bırakabiliyordu.
      if (remaining.length < 24 && cursor) void loadMore()
    }

    if (failedCount > 0) {
      setError(
        deleteTarget.kind === 'single'
          ? 'Fotoğraf silinemedi. Tekrar deneyebilirsin.'
          : `${formatCount(failedCount)} fotoğraf silinemedi; seçili bırakıldı. Tekrar "Sil" diyebilirsin.`,
      )
    } else if (deleteTarget.kind === 'bulk') {
      setNotice(`${formatCount(deletedIds.length)} fotoğraf silindi.`)
    }

    setDeleteTarget(null)
    setDeleteProgress(null)
    setDeleting(false)
  }, [cursor, deleteTarget, eventId, lightboxIndex, loadMore, photos, router, selected])

  // Toplu indirme: az sayıda fotoğrafta tarayıcıyı sırayla tetikler.
  const downloadSelected = useCallback(() => {
    if (selected.size > MAX_INDIVIDUAL_DOWNLOADS) {
      setNotice(
        `${formatCount(selected.size)} fotoğrafı tek tek indirmek tarayıcıda engellenir. Hepsini tek ZIP olarak almak için sayfanın üstündeki "Tüm Fotoğrafları İndir" düğmesini kullan.`,
      )
      return
    }
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

  // Ekrandakilerin hepsi silinmiş ama sunucuda hâlâ fotoğraf varsa boş durum gösterme.
  if (photos.length === 0 && !cursor) {
    return (
      <>
        {notice ? (
          <p role="status" className="mb-5 rounded-md bg-sand px-4 py-3 text-sm text-ink-soft">
            {notice}
          </p>
        ) : null}
        <EmptyState
          icon={<Images className="size-5" aria-hidden="true" />}
          title="Henüz fotoğraf yok"
          description="Misafirlerin fotoğraf yüklediğinde burada görebileceksin."
        />
      </>
    )
  }

  const selectedCount = selected.size

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          <span className="tabular-nums">{formatCount(photos.length)}</span> fotoğraf gösteriliyor
          {cursor ? ' (aşağı kaydırdıkça daha fazlası yüklenir)' : ''}
        </p>

        <div className="flex gap-2">
          <Button
            variant={selectionMode ? 'subtle' : 'ghost'}
            size="sm"
            onClick={() => (selectionMode ? clearSelection() : setSelectionMode(true))}
          >
            {selectionMode ? <CheckSquare aria-hidden="true" /> : <Square aria-hidden="true" />}
            {selectionMode ? 'Seçimi kapat' : 'Seç'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void selectAll()}
            disabled={selectingAll || deleting}
          >
            {selectingAll ? <Spinner label="Seçiliyor…" /> : 'Tümünü Seç'}
          </Button>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mb-5 rounded-md bg-danger-wash px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      {notice ? (
        <p role="status" className="mb-5 rounded-md bg-sand px-4 py-3 text-sm text-ink-soft">
          {notice}
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
            <Button variant="subtle" size="sm" onClick={downloadSelected} disabled={deleting}>
              İndir
            </Button>
            <Button
              variant="dangerGhost"
              size="sm"
              onClick={() => setDeleteTarget({ kind: 'bulk' })}
              disabled={deleting}
            >
              Sil
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={clearSelection}
              aria-label="Seçimi kaldır"
              disabled={deleting}
            >
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
        progress={deleteProgress}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
      />
    </>
  )
}
