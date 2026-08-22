'use client'

import { useEffect, useRef } from 'react'

/**
 * Düğün kutlaması — altın varak ve ivory yaprak yağmuru.
 *
 * Neden kütüphane yok: tek bir canvas ve tek bir RAF döngüsü yeterli.
 * Hazır konfeti paketleri 15-30 KB ekliyor ve genelde parlak parti renkleri
 * getiriyor; buradaki paleti ve hareketi düğün diline göre kendimiz kuruyoruz.
 *
 * Mobil öncelikli kararlar:
 *  - Parçacık sayısı ekran genişliğine göre ölçekleniyor.
 *  - devicePixelRatio en fazla 2 ile sınırlı (retina telefonlarda 3x boşuna yük).
 *  - Animasyon bitince RAF durup canvas DOM'dan kaldırılıyor; arka planda
 *    hiçbir şey dönmeye devam etmiyor.
 *  - Sayfa arka plana alınırsa (sekme değişimi) döngü duruyor.
 */

type Mode = 'fall' | 'burst'

interface CelebrationProps {
  /** 'fall' → yukarıdan süzülen karşılama. 'burst' → merkezden saçılan kutlama. */
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

function createParticle(width: number, height: number, mode: Mode): Particle {
  const kindRoll = Math.random()
  const kind: Particle['kind'] = kindRoll < 0.55 ? 'petal' : kindRoll < 0.9 ? 'foil' : 'dot'
  const color = kind === 'petal' ? pick(PETAL_COLORS) : pick(FOIL_COLORS)

  if (mode === 'burst') {
    // Merkezin biraz üstünden yukarı-dışa doğru saçılır, sonra yerçekimi alır.
    const angle = randomBetween(-Math.PI * 0.92, -Math.PI * 0.08)
    const speed = randomBetween(3.2, 8.4)
    return {
      x: width / 2 + randomBetween(-40, 40),
      y: height * 0.42 + randomBetween(-20, 20),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: randomBetween(0, Math.PI * 2),
      spin: randomBetween(-0.14, 0.14),
      size: kind === 'dot' ? randomBetween(2, 3.5) : randomBetween(6, 12),
      color,
      kind,
      swayPhase: randomBetween(0, Math.PI * 2),
      swaySpeed: randomBetween(0.02, 0.05),
      swayRange: randomBetween(0.2, 0.6),
      flutterPhase: randomBetween(0, Math.PI * 2),
      flutterSpeed: randomBetween(0.05, 0.11),
      life: 0,
      fadeStart: randomBetween(70, 110),
    }
  }

  // 'fall': ekranın üstünden, kademeli olarak süzülür.
  return {
    x: randomBetween(0, width),
    y: randomBetween(-height * 0.9, -20),
    vx: randomBetween(-0.25, 0.25),
    vy: randomBetween(0.9, 2.1),
    rotation: randomBetween(0, Math.PI * 2),
    spin: randomBetween(-0.05, 0.05),
    size: kind === 'dot' ? randomBetween(1.8, 3) : randomBetween(5, 11),
    color,
    kind,
    swayPhase: randomBetween(0, Math.PI * 2),
    swaySpeed: randomBetween(0.012, 0.032),
    swayRange: randomBetween(0.5, 1.4),
    flutterPhase: randomBetween(0, Math.PI * 2),
    flutterSpeed: randomBetween(0.03, 0.07),
    life: 0,
    fadeStart: Number.POSITIVE_INFINITY,
  }
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
    // Yaprak: bir ucu sivri elips.
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

    let width = window.innerWidth
    let height = window.innerHeight
    let dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    // Küçük ekranda daha az parçacık: 375px'te ~54, 1440px'te ~120.
    const density = mode === 'burst' ? 0.11 : 0.14
    const count = Math.round(Math.min(130, Math.max(46, width * density)))
    const particles = Array.from({ length: count }, () => createParticle(width, height, mode))

    const gravity = mode === 'burst' ? 0.14 : 0.012
    const drag = mode === 'burst' ? 0.985 : 1
    const maxFrames = mode === 'burst' ? 210 : 460

    let frame = 0
    let rafId = 0
    let stopped = false

    const stop = () => {
      if (stopped) return
      stopped = true
      cancelAnimationFrame(rafId)
      ctx.clearRect(0, 0, width, height)
      canvas.style.display = 'none'
    }

    const tick = () => {
      if (stopped) return
      frame += 1
      ctx.clearRect(0, 0, width, height)

      // Bitişe doğru tüm sahne yumuşakça sönsün.
      const globalFade =
        frame > maxFrames - 70 ? Math.max(0, (maxFrames - frame) / 70) : 1

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
        if (mode === 'fall') {
          if (p.x < -20) p.x = width + 20
          else if (p.x > width + 20) p.x = -20
        }

        if (p.y > height + 30) continue
        alive += 1

        let alpha = globalFade
        if (p.life > p.fadeStart) {
          alpha *= Math.max(0, 1 - (p.life - p.fadeStart) / 60)
        }
        // Süzülme modunda alt kenara yaklaşınca sönümlensin.
        if (mode === 'fall' && p.y > height * 0.78) {
          alpha *= Math.max(0, 1 - (p.y - height * 0.78) / (height * 0.22))
        }

        if (alpha > 0.01) drawParticle(ctx, p, alpha)
      }

      if (alive === 0 || frame >= maxFrames) {
        stop()
        return
      }
      rafId = requestAnimationFrame(tick)
    }

    // Sekme arka plandayken boşuna kare üretme.
    const onVisibility = () => {
      if (document.hidden) cancelAnimationFrame(rafId)
      else if (!stopped) rafId = requestAnimationFrame(tick)
    }

    canvas.style.display = 'block'
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', onVisibility)
    rafId = requestAnimationFrame(tick)

    return () => {
      stopped = true
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
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
