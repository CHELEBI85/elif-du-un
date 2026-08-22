import { z } from 'zod'

/**
 * Sunucu tarafı ortam değişkenleri.
 * Bu dosya asla bir client component'ten import edilmemelidir.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL tanımlı değil'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1, 'CLOUDINARY_CLOUD_NAME tanımlı değil'),
  CLOUDINARY_API_KEY: z.string().min(1, 'CLOUDINARY_API_KEY tanımlı değil'),
  CLOUDINARY_API_SECRET: z.string().min(1, 'CLOUDINARY_API_SECRET tanımlı değil'),
  AUTH_SECRET: z.string().min(16, 'AUTH_SECRET en az 16 karakter olmalı'),
  CRON_SECRET: z.string().min(16, 'CRON_SECRET en az 16 karakter olmalı'),
})

type ServerEnv = z.infer<typeof serverSchema>

let cached: ServerEnv | null = null

/** Doğrulanmış sunucu ortam değişkenlerini döndürür (ilk çağrıda doğrular). */
export function serverEnv(): ServerEnv {
  if (cached) return cached
  const parsed = serverSchema.safeParse(process.env)
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ')
    throw new Error(
      `Ortam değişkenleri eksik veya geçersiz: ${missing}. .env.example dosyasına bakın.`,
    )
  }
  cached = parsed.data
  return cached
}

/** Uygulamanın herkese açık kök adresi. Sondaki eğik çizgi temizlenir. */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL
  if (explicit && explicit.trim().length > 0) return explicit.trim().replace(/\/+$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
