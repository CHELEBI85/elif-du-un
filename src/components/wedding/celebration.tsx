'use client'

import { useEffect, useRef } from 'react'

/**
 * Düğün kutlaması — altın varak ve ivory yaprak yağmuru.
 *
 * Neden kütüphane yok: tek bir canvas ve tek bir RAF döngüsü yeterli.
 * Hazır konfeti paketleri 15-30 KB ekliyor ve genelde parlak parti renkleri
 * getiriyor; buradaki paleti ve hareketi düğün diline göre kendimiz kuruyoruz.
 *
 * İki mod:
 *  - 'fall'  → sayfa açık kaldığı sürece devam eden karşılama yağmuru.
 *              Ekranın altına düşen parçacık yok edilmez, yeniden yukarı
 *              alınır; böylece sabit sayıda nesneyle sonsuz akış sağlanır
 *              (her karede yeni nesne üretmek çöp toplayıcıyı yorardı).
 *  - 'burst' → fotoğraflar ulaştığında merkezden saçılan, kendiliğinden
 *              biten kısa kutlama.
 *
 * Mobil öncelikli kararlar:
 *  - Parçacık sayısı ekran genişliğine göre ölçekleniyor.
 *  - devicePixelRatio en fazla 2 ile sınırlı (retina telefonlarda 3x boşuna yük).
 *  - Sekme arka plana alınınca döngü tamamen duruyor; pil boşuna harcanmıyor.
 *  - `prefers-reduced-motion` açıksa hiç çalışmıyor.
 */

type Mode = 'fall' | 'burst'

interface CelebrationProps {
  /** 'fall' → kesintisiz karşılama yağmuru. 'burst' → merkezden saçılan kutlama. */
  mode?: Mode
  /** Değeri değişince animasyon yeniden başlar (ör. her başarılı yüklemede). */
  runKey?: number | string
}

/** Yaprak tonları — sıcak beyazdan kum bejine. */
const PETAL_COLORS = ['#ffffff', '#f6efe2', '#efe3d2', '#e8d9c8']
/** Varak tonları — paletteki altın ailesi. */
const FOIL_COLORS = ['#b99a64', '#c9ae7e', '#d4bc8b', '#a8874f']

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  rotation: number
  spin: number
  size: number
  color: string
  kind: 'petal' | 'foil' | 'dot'
  /** Yatay salınım — yaprağın havada süzülme hissi. */
  swayPhase: number
  swaySpeed: number
  swayRange: number
  /** 3B dönme yanılsaması için genişlik nabzı. */
  flutterPhase: number
  flutterSpeed: number
  life: number
  fadeStart: number
}

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min)
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T
}

/**
 * Süzülen bir parçacığı ekranın üstüne yeniden yerleştirir.
 * Yükseklik geniş bir aralıkta rastgele seçiliyor: hepsi aynı anda dönerse
 * dalga dalga bir "perde" oluşur, oysa dağınık dönüş doğal bir yağmur verir.
 */
function resetFalling(p: Particle, width: number, height: number, initial: boolean) {
  const kindRoll = Math.random()
  p.kind = kindRoll < 0.55 ? 'petal' : kindRoll < 0.9 ? 'foil' : 'dot'
  p.color = p.kind === 'petal' ? pick(PETAL_COLORS) : pick(FOIL_COLORS)

  p.x = randomBetween(0, width)
  // İlk açılışta hızlı dolsun, sonraki turlarda daha seyrek düşsün.
  p.y = initial ? randomBetween(-height * 0.55, -20) : randomBetween(-height * 1.15, -30)
  p.vx = randomBetween(-0.25, 0.25)
  p.vy = randomBetween(1.1, 2.4)
  p.rotation = randomBetween(0, Math.PI * 2)
  p.spin = randomBetween(-0.05, 0.05)
  p.size = p.kind === 'dot' ? randomBetween(1.8, 3) : randomBetween(5, 11)
  p.swayPhase = randomBetween(0, Math.PI * 2)
  p.swaySpeed = randomBetween(0.012, 0.032)
  p.swayRange = randomBetween(0.5, 1.4)
  p.flutterPhase = randomBetween(0, Math.PI * 2)
  p.flutterSpeed = randomBetween(0.03, 0.07)
  p.life = 0
  p.fadeStart = Number.POSITIVE_INFINITY
}

function createParticle(width: number, height: number, mode: Mode): Particle {
  const base: Particle = {
    x: 0, y: 0, vx: 0, vy: 0,
    rotation: 0, spin: 0, size: 6,
    color: '#ffffff', kind: 'petal',
    swayPhase: 0, swaySpeed: 0, swayRange: 0,
    flutterPhase: 0, flutterSpeed: 0,
    life: 0, fadeStart: Number.POSITIVE_INFINITY,
  }

  if (mode === 'fall') {
    resetFalling(base, width, height, true)
    return base
  }

  // 'burst': merkezin biraz üstünden yukarı-dışa saçılır, sonra yerçekimi alır.
  const kindRoll = Math.random()
  base.kind = kindRoll < 0.55 ? 'petal' : kindRoll < 0.9 ? 'foil' : 'dot'
  base.color = base.kind === 'petal' ? pick(PETAL_COLORS) : pick(FOIL_COLORS)

  const angle = randomBetween(-Math.PI * 0.92, -Math.PI * 0.08)
  const speed = randomBetween(3.2, 8.4)
  base.x = width / 2 + randomBetween(-40, 40)
  base.y = height * 0.42 + randomBetween(-20, 20)
  base.vx = Math.cos(angle) * speed
  base.vy = Math.sin(angle) * speed
  base.rotation = randomBetween(0, Math.PI * 2)
  base.spin = randomBetween(-0.14, 0.14)
  base.size = base.kind === 'dot' ? randomBetween(2, 3.5) : randomBetween(6, 12)
  base.swayPhase = randomBetween(0, Math.PI * 2)
  base.swaySpeed = randomBetween(0.02, 0.05)
  base.swayRange = randomBetween(0.2, 0.6)
  base.flutterPhase = randomBetween(0, Math.PI * 2)
  base.flutterSpeed = randomBetween(0.05, 0.11)
  base.fadeStart = randomBetween(70, 110)
  return base
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, alpha: number) {
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(p.x, p.y)
  ctx.rotate(p.rotation)

  // Yaprağın kenarı dönerken inceliyormuş gibi görünsün.
  const flutter = Math.cos(p.flutterPhase)
  ctx.fillStyle = p.color

  if (p.kind === 'dot') {
    ctx.beginPath()
    ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2)
    ctx.fill()
  } else if (p.kind === 'foil') {
    // İnce dikdörtgen varak — kalınlığı dönerken değişiyor.
    const w = p.size * 0.42
    const h = p.size * 1.15
    ctx.scale(Math.max(0.12, Math.abs(flutter)), 1)
    ctx.fillRect(-w / 2, -h / 2, w, h)
  } else {
    // Yaprak: yumuşak elips.
    ctx.scale(Math.max(0.15, Math.abs(flutter)), 1)
    ctx.beginPath()
    ctx.ellipse(0, 0, p.size * 0.42, p.size * 0.72, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.restore()
}

export function Celebration({ mode = 'fall', runKey = 0 }: CelebrationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Hareket hassasiyeti: kutlama tamamen kapanır.
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const continuous = mode === 'fall'

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let ready = false

    /**
     * Görünür alanı ölçer ve canvas tamponunu ayarlar.
     *
     * Bazı durumlarda (henüz yerleşim yapılmamış sekme, gömülü webview,
     * bfcache dönüşü) `innerWidth` ilk karede 0 gelebiliyor. Böyle bir anda
     * kurulum yapılırsa canvas 0x0 kalır ve konfeti hiç görünmez; bu yüzden
     * ölçü geçerli olana kadar bekleyip parçacıkları o an üretiyoruz.
     */
    const measure = (): boolean => {
      const w = window.innerWidth || document.documentElement.clientWidth || 0
      const h = window.innerHeight || document.documentElement.clientHeight || 0
      if (w <= 0 || h <= 0) return false

      width = w
      height = h
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return true
    }

    /*
      Yoğunluk: sürekli yağmur sayfanın tamamı boyunca açık kalacağı için
      metnin önüne geçmeyecek kadar seyrek tutuluyor. 375px'te ~38 parçacık,
      masaüstünde ~100.
    */
    const density = continuous ? 0.1 : 0.11
    const maxCount = continuous ? 100 : 130

    const buildParticles = () => {
      const count = Math.round(Math.min(maxCount, Math.max(34, width * density)))
      particles = Array.from({ length: count }, () => createParticle(width, height, mode))
    }

    /** Ölçü geçerli hâle geldiğinde kurulumu bir kez tamamlar. */
    const ensureReady = () => {
      if (!measure()) return false
      if (!ready) {
        ready = true
        buildParticles()
        schedule()
      }
      return true
    }

    const gravity = continuous ? 0.012 : 0.14
    const drag = continuous ? 1 : 0.985
    // Sürekli modda bitiş yok; patlama ~3.5 sn sonra kapanır.
    const maxFrames = continuous ? Number.POSITIVE_INFINITY : 210

    let frame = 0
    let rafId = 0
    let stopped = false
    let frameQueued = false

    const stop = () => {
      if (stopped) return
      stopped = true
      frameQueued = false
      cancelAnimationFrame(rafId)
      ctx.clearRect(0, 0, width, height)
      canvas.style.display = 'none'
    }

    /**
     * Tek bir kare planlar.
     * `frameQueued` koruması olmasa, sekme görünür hâle geldiğinde hem
     * baştan bekleyen kare hem de yeni kare çalışır ve animasyon çift
     * hızda akardı. Sayfa gizliyken hiç kare planlamıyoruz.
     */
    const schedule = () => {
      if (stopped || frameQueued || !ready || document.hidden) return
      frameQueued = true
      rafId = requestAnimationFrame(tick)
    }

    const tick = () => {
      frameQueued = false
      if (stopped) return
      frame += 1
      ctx.clearRect(0, 0, width, height)

      // Yalnızca patlama modunda sahne sonunda sönümlenir.
      const globalFade =
        !continuous && frame > maxFrames - 70 ? Math.max(0, (maxFrames - frame) / 70) : 1

      let alive = 0

      for (const p of particles) {
        p.life += 1
        p.swayPhase += p.swaySpeed
        p.flutterPhase += p.flutterSpeed

        p.vy += gravity
        p.vx *= drag
        p.vy *= drag

        p.x += p.vx + Math.sin(p.swayPhase) * p.swayRange
        p.y += p.vy
        p.rotation += p.spin

        // Yanlardan çıkanı diğer taraftan geri al (yalnızca süzülme modunda).
        if (continuous) {
          if (p.x < -20) p.x = width + 20
          else if (p.x > width + 20) p.x = -20
        }

        if (p.y > height + 30) {
          // Sürekli modda parçacık yok edilmez, başa alınır.
          if (continuous) resetFalling(p, width, height, false)
          continue
        }
        alive += 1

        let alpha = globalFade
        if (p.life > p.fadeStart) {
          alpha *= Math.max(0, 1 - (p.life - p.fadeStart) / 60)
        }
        // Süzülme modunda alt kenara yaklaşınca sönümlensin.
        if (continuous && p.y > height * 0.8) {
          alpha *= Math.max(0, 1 - (p.y - height * 0.8) / (height * 0.2))
        }

        if (alpha > 0.01) drawParticle(ctx, p, alpha)
      }

      if (!continuous && (alive === 0 || frame >= maxFrames)) {
        stop()
        return
      }
      schedule()
    }

    // Sekme arka plandayken boşuna kare üretme.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId)
        frameQueued = false
      } else {
        ensureReady()
        schedule()
      }
    }

    const onResize = () => {
      ensureReady()
    }

    canvas.style.display = 'block'
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVisibility)

    /*
      ResizeObserver, `resize` olayının gelmediği durumları da yakalar:
      panel/webview sonradan boyutlanması, mobilde adres çubuğunun açılıp
      kapanması gibi. Ölçü sıfırdan gerçek değere geçtiği anda kurulum tamamlanır.
    */
    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => ensureReady())
      observer.observe(document.documentElement)
    }

    ensureReady()

    return () => {
      stopped = true
      frameQueued = false
      cancelAnimationFrame(rafId)
      observer?.disconnect()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [mode, runKey])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      // Ekran okuyucular ve fare için tamamen şeffaf bir katman.
      className="pointer-events-none fixed inset-0 z-30 hidden"
    />
  )
}
