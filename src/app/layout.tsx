import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, Inter } from 'next/font/google'
import { appUrl } from '@/lib/env'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-cormorant',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: 'Elif & Yunus Emre',
    template: '%s — Elif & Yunus Emre',
  },
  description: 'Düğünümüzde çektiğiniz fotoğrafları bizimle paylaşın.',
  robots: { index: false, follow: false },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = {
  themeColor: '#FCFAF6',
  width: 'device-width',
  initialScale: 1,
  // Misafirler fotoğraf önizlemelerini yakınlaştırabilmeli.
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${cormorant.variable} ${inter.variable}`}>
      <head>
        {/*
          JavaScript kapalıysa kaydırmayla açılan bölümler gizli kalmasın.
          "Fotoğraf Yükle" alanı bu sarmalayıcının içinde olduğu için kritik.
        */}
        <noscript>
          <style>{`.reveal{opacity:1 !important;transform:none !important}`}</style>
        </noscript>
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
