'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

/**
 * Görüş alanına girince içeriği yumuşakça açar.
 *
 * Animasyonun tamamı CSS'te (`.reveal`); burada yalnızca bir öznitelik
 * değişiyor. Böylece ek bir animasyon kütüphanesi taşımıyoruz ve
 * `prefers-reduced-motion` kuralı otomatik geçerli oluyor.
 *
 * GÜVENLİK AĞI — bu bileşen "Fotoğraf Yükle" düğmesini sarmalıyor; hiçbir
 * koşulda içeriği gizli bırakamaz. Bu yüzden üç kat koruma var:
 *   1. Bağlanır bağlanmaz öğe zaten ekrandaysa doğrudan açılır.
 *   2. IntersectionObserver aşağıdaki içerik için normal yolu işletir.
 *   3. Observer herhangi bir nedenle tetiklenmezse (arka plan sekmesi,
 *      kare üretmeyen görünüm, eski tarayıcı) zamanlayıcı içeriği açar.
 */
const FAILSAFE_MS = 1200

export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  /** Milisaniye cinsinden gecikme — kademeli açılma için. */
  delay?: number
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    let done = false
    const show = () => {
      if (done) return
      done = true
      setVisible(true)
    }

    // 1) Zaten görünürse beklemeye gerek yok.
    const rect = node.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      show()
      return
    }

    // 3) Observer sessiz kalırsa içerik yine de açılsın.
    const failsafe = window.setTimeout(show, FAILSAFE_MS)

    if (typeof IntersectionObserver === 'undefined') {
      return () => window.clearTimeout(failsafe)
    }

    // 2) Normal yol.
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          show()
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.01 },
    )
    observer.observe(node)

    return () => {
      window.clearTimeout(failsafe)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={ref}
      data-visible={visible ? 'true' : 'false'}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn('reveal', className)}
    >
      {children}
    </div>
  )
}
