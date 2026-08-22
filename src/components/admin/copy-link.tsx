'use client'

import { useState } from 'react'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Pano izni yoksa kullanıcı adresi elle seçebilir.
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="break-all rounded-md border border-line bg-cream px-3.5 py-3 font-mono text-xs leading-relaxed text-ink-soft">
        {url}
      </p>
      <div className="flex gap-2">
        <Button variant="subtle" size="sm" onClick={() => void copy()}>
          {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {copied ? 'Kopyalandı' : 'Kopyala'}
        </Button>
        <Button asChild variant="ghost" size="sm">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden="true" />
            Aç
          </a>
        </Button>
      </div>
    </div>
  )
}
