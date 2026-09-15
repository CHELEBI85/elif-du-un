'use client'

import { useState } from 'react'
import { Check, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { messages } from '@/lib/messages'

/** /api/events/[id]/download yanıtındaki arşiv (sunucudaki DownloadArchive ile aynı). */
interface Archive {
  label: string
  count: number
  endpoint: string
  fields: Array<[string, string]>
  /** İmzanın geçersiz olacağı an (unix saniye). */
  expiresAt: number
}

/** İmzanın bitmesine bu kadar kala bağlantılar yenilenir. */
const REFRESH_MARGIN_SECONDS = 5 * 60

/** Tıklama anında çağrılır; saat okuması render'a karışmasın diye bileşen dışında. */
function isExpiringSoon(archive: Archive): boolean {
  return archive.expiresAt - Math.floor(Date.now() / 1000) < REFRESH_MARGIN_SECONDS
}

/**
 * Arşivi gizli bir POST formuyla doğrudan Cloudinary'ye ister.
 *
 * Neden form: fotoğraf kimlikleri adrese değil istek gövdesine gider (yüzlerce
 * fotoğrafta adres sınırı aşılıyordu). ZIP doğrudan Cloudinary'den tarayıcıya
 * akar; hiçbir fotoğraf bu sayfanın belleğine alınmaz.
 *
 * Yeni sekme: indirme başarılıysa sekme yalnızca dosyayı indirir. Cloudinary
 * bir hata dönerse hata yeni sekmede görünür, yönetim paneli yerinde kalır.
 * Bu fonksiyon mutlaka doğrudan tıklama içinde çağrılmalı; aksi hâlde tarayıcı
 * yeni sekmeyi açılır pencere sayıp engelleyebilir.
 */
function submitArchive(archive: Archive) {
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = archive.endpoint
  form.target = '_blank'
  form.rel = 'noopener noreferrer'
  form.style.display = 'none'

  for (const [name, value] of archive.fields) {
    const input = document.createElement('input')
    input.type = 'hidden'
    input.name = name
    input.value = value
    form.appendChild(input)
  }

  document.body.appendChild(form)
  form.submit()
  form.remove()
}

export function DownloadAllButton({
  eventId,
  photoCount,
}: {
  eventId: string
  photoCount: number
}) {
  const [loading, setLoading] = useState(false)
  const [archives, setArchives] = useState<Archive[] | null>(null)
  const [started, setStarted] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const prepare = async () => {
    setLoading(true)
    setError(null)
    setNotice(null)
    try {
      const response = await fetch(`/api/events/${eventId}/download`)
      if (!response.ok) throw new Error('failed')
      const data = (await response.json()) as { archives: Archive[] }
      setArchives(data.archives)
      setStarted(new Set())
    } catch {
      setError(messages.errors.server)
    } finally {
      setLoading(false)
    }
  }

  const download = (archive: Archive, index: number) => {
    if (isExpiringSoon(archive)) {
      // İmza bayatlamak üzere: yenile, kullanıcı tekrar tıklasın. Beklemeden
      // sonra form göndermek tarayıcıda açılır pencere engeline takılırdı.
      setNotice('İndirme bağlantılarının süresi doldu, yenilendi. Lütfen tekrar tıklayın.')
      void prepare()
      return
    }
    submitArchive(archive)
    setStarted((prev) => new Set(prev).add(index))
  }

  if (photoCount === 0) {
    return (
      <Button variant="outline" size="md" disabled>
        <Download aria-hidden="true" />
        Tüm Fotoğrafları İndir
      </Button>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <Button variant="outline" size="md" onClick={() => void prepare()} disabled={loading}>
        {loading ? (
          <Spinner label="Hazırlanıyor…" />
        ) : (
          <>
            <Download aria-hidden="true" />
            Tüm Fotoğrafları İndir
          </>
        )}
      </Button>

      {archives && archives.length > 0 ? (
        <div className="rounded-md border border-line bg-ivory p-4">
          <p className="text-xs leading-relaxed text-muted">
            {archives.length > 1
              ? `Fotoğraflar ${archives.length} ZIP dosyasına bölündü. Her birine ayrı ayrı tıklayın.`
              : 'ZIP dosyası hazır.'}{' '}
            İndirme yeni bir sekmede başlar; büyük dosyalar birkaç dakika sürebilir.
          </p>
          <ul className="mt-3 flex flex-col gap-2">
            {archives.map((archive, index) => (
              <li key={archive.label}>
                <Button
                  variant={started.has(index) ? 'subtle' : 'primary'}
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => download(archive, index)}
                >
                  <span className="truncate">
                    {archive.label} · {archive.count} fotoğraf
                  </span>
                  {started.has(index) ? (
                    <Check aria-label="İndirme başlatıldı" />
                  ) : (
                    <Download aria-hidden="true" />
                  )}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {notice ? (
        <p role="status" className="text-sm text-ink-soft">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
