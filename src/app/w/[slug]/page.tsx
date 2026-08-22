import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { WeddingHero } from '@/components/wedding/wedding-hero'
import { UploadExperience } from '@/components/wedding/upload-experience'
import { ExpiredNotice } from '@/components/wedding/expired-notice'
import { PrivacyNote } from '@/components/wedding/privacy-note'
import { Reveal } from '@/components/wedding/reveal'
import { Ornament } from '@/components/wedding/ornament'
import { Celebration } from '@/components/wedding/celebration'
import { getEventBySlug, resolveUploadState } from '@/lib/events'

// Etkinlik durumu (süre dolumu, yükleme anahtarı) her istekte taze okunmalı.
export const dynamic = 'force-dynamic'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) return { title: 'Bulunamadı' }
  return {
    // Kök şablonun ismi ikinci kez eklememesi için mutlak başlık kullanılır.
    title: { absolute: event.coupleName },
    description: 'Düğünde çektiğiniz fotoğrafları bizimle paylaşın.',
    openGraph: {
      title: event.coupleName,
      description: 'Düğünde çektiğiniz fotoğrafları bizimle paylaşın.',
      images: event.coverImage ? [event.coverImage] : undefined,
    },
  }
}

export default async function WeddingPage({ params }: PageProps) {
  const { slug } = await params
  const event = await getEventBySlug(slug)
  if (!event) notFound()

  const { canUpload, manuallyDisabled } = resolveUploadState(event)

  return (
    <main className="flex min-h-dvh flex-col bg-ivory">
      {/*
        Karşılama kutlaması yalnızca etkinlik aktifken oynar; süresi dolmuş
        bir sayfada konfeti yersiz kaçardı.
      */}
      {canUpload ? <Celebration mode="fall" /> : null}

      <WeddingHero
        coupleName={event.coupleName}
        eventDate={event.eventDate}
        coverImage={event.coverImage}
      />

      <section
        aria-label="Fotoğraf paylaşımı"
        className="mx-auto w-full max-w-xl flex-1 px-5 pb-20 sm:px-6"
      >
        {canUpload ? (
          <>
            <Reveal>
              {/*
                Yükleme alanı kendi kağıdı üzerinde duruyor: hero'nun geniş
                boşluğundan sonra içeriğe net bir çerçeve veriyor.
              */}
              <div className="rounded-xl border border-line bg-cream/70 px-5 py-9 shadow-soft sm:px-8 sm:py-11">
                <UploadExperience slug={event.slug} coupleName={event.coupleName} />
              </div>
            </Reveal>

            <Reveal delay={120}>
              <div className="mt-10">
                <PrivacyNote retentionDays={event.retentionDays} />
              </div>
            </Reveal>
          </>
        ) : (
          <Reveal>
            <ExpiredNotice manuallyDisabled={manuallyDisabled} />
          </Reveal>
        )}
      </section>

      <footer className="pb-12 text-center">
        <Ornament className="mx-auto mb-5 opacity-70" width="w-16" />
        <p className="font-serif text-base italic text-muted">{event.coupleName}</p>
      </footer>
    </main>
  )
}
