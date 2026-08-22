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
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

/** Silme onayı. Fotoğraflar hem Cloudinary'den hem veritabanından silinir. */
export function DeletePhotosDialog({
  open,
  count,
  pending,
  onOpenChange,
  onConfirm,
}: DeletePhotosDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {count === 1 ? 'Fotoğraf silinsin mi?' : `${formatCount(count)} fotoğraf silinsin mi?`}
          </DialogTitle>
          <DialogDescription>
            Bu işlem geri alınamaz. Fotoğraflar Cloudinary&apos;den de kalıcı olarak silinir.
          </DialogDescription>
        </DialogHeader>

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
