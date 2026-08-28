'use client'

import { useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { formatCount } from '@/lib/format'
import { deleteEventAction } from '@/app/admin/(panel)/events/actions'

function ConfirmButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" variant="danger" size="md" disabled={disabled || pending}>
      {pending ? <Spinner label="Siliniyor…" /> : 'Etkinliği Sil'}
    </Button>
  )
}

/** Geri alınamaz silme. Onay için çift adının yazılması istenir. */
export function DeleteEventCard({
  eventId,
  coupleName,
  photoCount,
}: {
  eventId: string
  coupleName: string
  photoCount: number
}) {
  const [confirmText, setConfirmText] = useState('')
  const matches = confirmText.trim() === coupleName

  return (
    <div className="rounded-lg border border-danger/25 bg-danger-wash/50 p-5 sm:p-6">
      <h2 className="font-serif text-xl font-medium text-ink">Etkinliği sil</h2>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted">
        Etkinlik ve ona ait {formatCount(photoCount)} fotoğraf hem Cloudinary&apos;den hem
        veritabanından kalıcı olarak silinir. Bu işlem geri alınamaz.
      </p>
      <p className="mt-3 max-w-lg text-sm leading-relaxed text-danger">
        Bu kurulum tek bir düğün içindir ve panelde etkinlik oluşturma ekranı yoktur. Silersen
        misafir sayfası çalışmayı bırakır ve etkinliği yalnızca sunucuda{' '}
        <code className="rounded-xs bg-danger-wash px-1 py-0.5 font-mono text-xs">
          npm run db:seed
        </code>{' '}
        komutuyla yeniden oluşturabilirsin. Yalnızca fotoğrafları silmek istiyorsan bunun yerine
        galeriyi kullan.
      </p>

      <Dialog>
        <DialogTrigger asChild>
          <Button variant="dangerGhost" size="md" className="mt-5">
            <Trash2 aria-hidden="true" />
            Etkinliği Sil
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>{coupleName} etkinliği silinsin mi?</DialogTitle>
            <DialogDescription>
              {formatCount(photoCount)} fotoğraf kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>

          <form action={deleteEventAction} className="flex flex-col gap-4">
            <input type="hidden" name="id" value={eventId} />

            <div className="flex flex-col gap-2">
              <label htmlFor="confirm-name" className="text-sm text-ink-soft">
                Onaylamak için <span className="font-medium text-ink">{coupleName}</span> yazın.
              </label>
              <Input
                id="confirm-name"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                autoComplete="off"
                aria-invalid={confirmText.length > 0 && !matches}
              />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" size="md">
                  Vazgeç
                </Button>
              </DialogClose>
              <ConfirmButton disabled={!matches} />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
