import Image from 'next/image'
import { formatWeddingDate } from '@/lib/format'
import { Ampersand, Ornament } from './ornament'

interface WeddingHeroProps {
  /** Herkese açık çift adı, ör. "Elif & Yunus Emre" */
  coupleName: string
  eventDate: Date | null
  coverImage: string | null
}

/**
 * Çift adını ikiye ayırır ki "&" işareti kendi satırında, altın rengiyle
 * durabilsin. Ayrılamıyorsa isim tek parça gösterilir.
 */
function splitCoupleName(name: string): [string, string] | null {
  const parts = name.split(/\s*&\s*/)
  if (parts.length !== 2) return null
  const [first, second] = parts
  if (!first?.trim() || !second?.trim()) return null
  return [first.trim(), second.trim()]
}

export function WeddingHero({ coupleName, eventDate, coverImage }: WeddingHeroProps) {
  const pair = splitCoupleName(coupleName)
  const dateLabel = formatWeddingDate(eventDate)

  return (
    <header className="relative isolate overflow-hidden">
      {coverImage ? (
        <>
          <Image src={coverImage} alt="" fill priority sizes="100vw" className="-z-20 object-cover" />
          {/*
            Fotoğrafı boğmadan metni okunur kılan sıcak örtü. Alt kenar
            sayfanın zeminine eriyor, böylece kesik bir bant oluşmuyor.
          */}
          <div aria-hidden="true" className="cover-fade absolute inset-0 -z-10" />
        </>
      ) : (
        <>
          <div aria-hidden="true" className="absolute inset-0 -z-20 bg-cream" />
          <div aria-hidden="true" className="vignette-warm absolute inset-0 -z-10" />
          <div aria-hidden="true" className="paper-grain absolute inset-0 -z-10 opacity-70" />
        </>
      )}

      {/*
        Yükseklik bilinçli olarak sınırlı: misafir QR'ı okuttuğunda
        "Fotoğraf Yükle" düğmesi ilk ekranda görünmeli. Daha uzun bir hero'da
        düğme katlamanın altında kalıyor ve kullanıcı kaydırmak zorunda
        kalıyordu. `svh` kullanılıyor ki mobil tarayıcı çubukları açıkken de
        hesap doğru olsun.
      */}
      <div className="mx-auto flex min-h-[64svh] max-w-2xl flex-col items-center justify-center px-6 py-14 text-center [@media(max-height:740px)]:py-8 sm:min-h-[76svh] sm:py-20">
        <div className="stagger flex w-full flex-col items-center">
          <p className="eyebrow">{dateLabel ?? 'Düğünümüz'}</p>

          <Ornament className="mt-7 [@media(max-height:740px)]:mt-5" width="w-28" animated />

          {/*
            Görsel olarak isimler üç satıra ayrılıyor; ekran okuyucular ise
            tek ve doğru bir başlık duyuyor.
          */}
          <h1 className="mt-10 w-full [@media(max-height:740px)]:mt-6">
            <span className="sr-only">{coupleName}</span>
            {pair ? (
              <span aria-hidden="true" className="flex w-full flex-col items-center gap-2 sm:gap-3">
                <span className="text-display block text-ink">{pair[0]}</span>
                <Ampersand />
                <span className="text-display block text-ink">{pair[1]}</span>
              </span>
            ) : (
              <span aria-hidden="true" className="text-display block text-ink">
                {coupleName}
              </span>
            )}
          </h1>

          <Ornament className="mt-10 [@media(max-height:740px)]:mt-6" width="w-28" animated />

          <p className="pull-quote mt-10 max-w-md [@media(max-height:740px)]:mt-6">
            Bu güzel günün anılarını sizin gözünüzden görmek istiyoruz.
          </p>

          {/*
            Asıl yönerge bu satır — misafirin ne yapması gerektiğini söylüyor.
            Şiirsel cümleden daha ağır bassın diye en koyu ton, orta kalınlık
            ve daha iri punto kullanılıyor; ayrıca sürekli akan konfetinin
            önünde net okunması gerekiyor.
          */}
          <p className="mt-7 max-w-md text-xl font-medium leading-snug text-ink [@media(max-height:740px)]:mt-5 sm:text-2xl">
            Düğünde çektiğiniz fotoğrafları bizimle paylaşın.
          </p>
        </div>
      </div>

      {/* Aşağıda içerik olduğunu belli eden çok sessiz bir işaret. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center"
      >
        <svg viewBox="0 0 24 24" fill="none" className="size-5 animate-hint text-faint">
          <path
            d="M7 10l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </header>
  )
}
