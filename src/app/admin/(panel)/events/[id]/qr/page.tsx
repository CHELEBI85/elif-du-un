import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Download } from 'lucide-react'
import { prisma } from '@/lib/prisma'
import { buildQrDataUrl, weddingUrl } from '@/lib/qr'
import { PageHeader } from '@/components/admin/page-header'
import { QrCard } from '@/components/admin/qr-card'
import { PrintButton } from '@/components/admin/print-button'
import { CopyLink } from '@/components/admin/copy-link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = { title: 'QR Kod' }
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function QrPage({ params }: PageProps) {
  const { id } = await params

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, slug: true, coupleName: true, eventDate: true },
  })
  if (!event) notFound()

  const url = weddingUrl(event.slug)
  const qrDataUrl = await buildQrDataUrl(url)

  return (
    <>
      <PageHeader
        title="QR Kod"
        description="QR kodunu düğün alanındaki masalara veya panolara yerleştirebilirsin."
        backHref={`/admin/events/${id}`}
        backLabel="Etkinlik"
        actions={
          <>
            <Button asChild variant="primary" size="md">
              <a href={`/api/events/${id}/qr?format=png&size=1600`} download>
                <Download aria-hidden="true" />
                PNG İndir
              </a>
            </Button>
            <Button asChild variant="outline" size="md">
              <a href={`/api/events/${id}/qr?format=svg`} download>
                <Download aria-hidden="true" />
                SVG İndir
              </a>
            </Button>
            <PrintButton />
          </>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
        <QrCard
          coupleName={event.coupleName}
          eventDate={event.eventDate}
          qrDataUrl={qrDataUrl}
          url={url}
        />

        <div className="print-hidden flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Misafir bağlantısı</CardTitle>
            </CardHeader>
            <CardContent>
              <CopyLink url={url} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Baskı önerileri</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3 text-sm leading-relaxed text-muted">
                <li>
                  <span className="font-medium text-ink">A6 masa kartı:</span> her masaya bir adet.
                  QR kodun kenar uzunluğu en az 4 cm olsun.
                </li>
                <li>
                  <span className="font-medium text-ink">A5 pano:</span> giriş ve kokteyl alanı için.
                </li>
                <li>
                  <span className="font-medium text-ink">Büyük tabela:</span> yüksek çözünürlük için
                  SVG dosyasını kullan; SVG her boyutta net kalır.
                </li>
                <li>
                  Yazdırmadan önce telefonunla kodu okutup sayfanın açıldığını doğrula.
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Önemli</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted">
                Bağlantı adresini (slug) değiştirirsen basılı tüm QR kodları geçersiz olur.
                Kartları bastırdıktan sonra adresi değiştirmemeye özen göster.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
