'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { messages } from '@/lib/messages'

interface Archive {
  url: string
  count: number
  label: string
}

/**
 * ZIP arşivi Cloudinary tarafında oluşturulur; tarayıcı yalnızca hazır
 * bağlantıyı açar. Böylece hiçbir fotoğraf tarayıcı belleğine alınmaz.
 */
export function DownloadAllButton({
  eventId,
  photoCount,
}: {
  eventId: string
  photoCount: number
}) {
  const [loading, setLoading] = useState(false)
  const [archives, setArchives] = useState<Archive[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const request = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/events/${eventId}/download`)
      if (!response.ok) throw new Error('failed')
      const data = (await response.json()) as { archives: Archive[] }

      if (data.archives.length === 1 && data.archives[0]) {
        window.location.href = data.archives[0].url
        setArchives(null)
      } else {
        // Birden fazla parça varsa kullanıcı her birini ayrı indirir.
        setArchives(data.archives)
      }
    } catch {
      setError(messages.errors.server)
    } finally {
      setLoading(false)
    }
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
      <Button variant="outline" size="md" onClick={() => void request()} disabled={loading}>
        {loading ? (
          <Spinner label="Arşiv hazırlanıyor…" />
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
            Fotoğraflar {archives.length} arşive bölündü. Her bölümü ayrı ayrı indirin.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {archives.map((archive) => (
              <li key={archive.url}>
                <Button asChild variant="subtle" size="sm">
                  <a href={archive.url}>
                    {archive.label} ({archive.count})
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
