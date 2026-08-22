/**
 * Basit, bağımlılıksız sabit pencereli hız sınırlayıcı.
 *
 * NOT: Bellek içi olduğu için sunucusuz ortamda her lambda örneğinin kendi
 * sayacı olur. Bu yüzden burası yalnızca ilk savunma hattıdır; asıl ve
 * kesin sınır veritabanındaki oturum başına fotoğraf sayısıdır
 * (bkz. MAX_PHOTOS_PER_SESSION ve upload ticket kayıtları).
 * Çok örnekli dağıtımda Upstash Redis'e taşımak yeterlidir.
 */
interface Bucket {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()
const MAX_KEYS = 5000

export interface RateLimitResult {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()

  // Sınırsız büyümeyi engelle: süresi geçmiş anahtarları temizle.
  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) {
      if (v.resetAt <= now) buckets.delete(k)
    }
  }

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 }
  }

  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 }
}

/** İstekten en iyi tahmini istemci IP'sini çıkarır. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return headers.get('x-real-ip') ?? '0.0.0.0'
}
