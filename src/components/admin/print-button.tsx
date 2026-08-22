'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintButton() {
  return (
    <Button variant="outline" size="md" onClick={() => window.print()}>
      <Printer aria-hidden="true" />
      QR Kartını Yazdır
    </Button>
  )
}
