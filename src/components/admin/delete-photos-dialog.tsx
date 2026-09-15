'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { formatCount } from '@/lib/format'

interface DeletePhotosDialogProps {
  open: boolean
  count: number
  pending: boolean
  /** Toplu silmede işlenen fotoğraf sayısı; yalnızca pending iken gösterilir. */
  progress?: { done: number; total: number } | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/** Silme onayı. Fotoğraflar hem Cloudinary'den hem veritabanından silinir. */
export function DeletePhotosDialog({
  open,
  count,
  pending,
  progress,
  onOpenChange,
  onConfirm,
}: DeletePhotosDialogProps) {
  const percent =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent hideClose={pending}>
        <DialogHeader>
          <DialogTitle>
            {count === 1 ? 'Fotoğraf silinsin mi?' : `${formatCount(count)} fotoğraf silinsin mi?`}
          </DialogTitle>
          <DialogDescription>
            Bu işlem geri alınamaz. Fotoğraflar Cloudinary&apos;den de kalıcı olarak silinir.
          </DialogDescription>
        </DialogHeader>

        {pending && progress && progress.total > 1 ? (
          <div role="status" aria-live="polite" className="flex flex-col gap-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-soft">Siliniyor…</span>
              <span className="tabular-nums text-muted">
                {formatCount(progress.done)} / {formatCount(progress.total)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-sand">
              <div
                className="h-full rounded-full bg-danger transition-[width] duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="text-xs text-muted">Bitene kadar bu sayfayı kapatma.</p>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" size="md" disabled={pending} onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button variant="danger" size="md" disabled={pending} onClick={onConfirm}>
            {pending ? <Spinner label="Siliniyor…" /> : 'Fotoğrafları Sil'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
