import { formatWeddingDate } from '@/lib/format'
import { Ornament } from '@/components/wedding/ornament'

interface QrCardProps {
  coupleName: string
  eventDate: Date | null
  qrDataUrl: string
  url: string
}

/**
 * Yazdırılabilir düğün QR kartı.
 *
 * A5 / A6 / masa kartı ve pano baskısı için tasarlandı: kart sabit bir en-boy
 * oranı yerine esnek bir kolon kullanır, böylece hangi kağıda basılırsa
 * basılsın oranlar korunur. Yazdırma sırasında panel arayüzü `print-hidden`
 * ile gizlenir.
 *
 * İç çerçeve (double rule) klasik davetiye baskısından geliyor; basıldığında
 * kartın kenarları net bir bitiş kazanıyor.
 */
export function QrCard({ coupleName, eventDate, qrDataUrl, url }: QrCardProps) {
  const dateLabel = formatWeddingDate(eventDate)

  return (
    <div className="print-sheet print-card mx-auto w-full max-w-[420px] border border-line-strong bg-ivory p-2.5 shadow-soft">
      <div className="border border-gold/30 px-9 py-11 text-center">
        <p className="text-[0.5625rem] font-medium uppercase tracking-[0.36em] text-muted">
          {dateLabel ?? 'Düğünümüz'}
        </p>

        <Ornament className="mx-auto mt-5" width="w-20" />

        <h2 className="mt-7 font-serif text-[2.125rem] font-light leading-[1.1] text-ink">
          {coupleName}
        </h2>

        <p className="mt-4 font-serif text-lg font-light italic leading-relaxed text-muted">
          Anılarımızı bizimle paylaşın.
        </p>

        <div className="mt-9 flex justify-center">
          <div className="border border-line bg-white p-3.5">
            {/* Data URL olarak gömülür — yazdırırken ağ isteği beklenmez. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrDataUrl}
              alt={`${coupleName} fotoğraf paylaşım sayfasının QR kodu`}
              width={210}
              height={210}
              className="size-[210px]"
            />
          </div>
        </div>

        <p className="mt-8 text-[0.8125rem] leading-relaxed text-ink-soft">
          Düğünde çektiğin fotoğrafları QR kodu okutarak bize gönderebilirsin.
        </p>

        <Ornament className="mx-auto mt-7 opacity-70" width="w-12" />

        <p className="mt-4 break-all text-[0.625rem] leading-relaxed tracking-wide text-faint">
          {url}
        </p>
      </div>
    </div>
  )
}
