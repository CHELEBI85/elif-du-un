import 'server-only'
import { v2 as cloudinary } from 'cloudinary'
import { createHash } from 'node:crypto'
import { serverEnv } from './env'
import { log } from './logger'

let configured = false

/** Yapılandırılmış Cloudinary SDK'sını döndürür. Sadece sunucuda çalışır. */
export function getCloudinary() {
  if (!configured) {
    const env = serverEnv()
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    })
    configured = true
  }
  return cloudinary
}

export function cloudName(): string {
  return serverEnv().CLOUDINARY_CLOUD_NAME
}

export function apiKey(): string {
  return serverEnv().CLOUDINARY_API_KEY
}

export interface SignedUploadParams {
  publicId: string
  timestamp: number
}

/**
 * Tek bir yükleme icin kisa omurlu imza uretir.
 * Yalnizca `public_id` ve `timestamp` imzalanir; istemci baska bir parametre
 * gonderirse Cloudinary imzayi reddeder.
 */
export function signUpload({ publicId, timestamp }: SignedUploadParams): string {
  const env = serverEnv()
  const toSign = `public_id=${publicId}&timestamp=${timestamp}`
  return createHash('sha1').update(toSign + env.CLOUDINARY_API_SECRET).digest('hex')
}

/** Cloudinary yukleme uc noktasi (gorsel). */
export function uploadEndpoint(): string {
  return `https://api.cloudinary.com/v1_1/${cloudName()}/image/upload`
}

/** Verilen public_id icin turetilmis kucuk onizleme adresi. */
export function thumbnailUrl(publicId: string, size = 480): string {
  return `https://res.cloudinary.com/${cloudName()}/image/upload/c_fill,g_auto,w_${size},h_${size},q_auto:good,f_auto/${publicId}`
}

/** Orta boy onizleme (lightbox icin) — orijinali indirmeden gosterir. */
export function previewUrl(publicId: string, width = 1600): string {
  return `https://res.cloudinary.com/${cloudName()}/image/upload/c_limit,w_${width},q_auto:good,f_auto/${publicId}`
}

/** Tarayicida acmak yerine dosyayi indirmeye zorlayan adres. */
export function downloadUrl(publicId: string, format: string, filename?: string): string {
  const safeName = (filename ?? publicId.split('/').pop() ?? 'foto').replace(/[^\w.-]/g, '_')
  const base = safeName.replace(/\.[^.]+$/, '')
  return `https://res.cloudinary.com/${cloudName()}/image/upload/fl_attachment:${encodeURIComponent(
    base,
  )}/${publicId}.${format}`
}

/**
 * Cloudinary'den kaynaklari siler. Idempotent'tir: zaten silinmis bir
 * public_id "not_found" doner ve bu bir hata sayilmaz.
 *
 * Cloudinary Admin API cagri basina en fazla 100 public_id kabul eder.
 */
export async function deleteResources(publicIds: string[]): Promise<{
  deleted: string[]
  missing: string[]
  failed: string[]
}> {
  const deleted: string[] = []
  const missing: string[] = []
  const failed: string[] = []
  if (publicIds.length === 0) return { deleted, missing, failed }

  const cld = getCloudinary()
  for (let i = 0; i < publicIds.length; i += 100) {
    const chunk = publicIds.slice(i, i + 100)
    try {
      const result = (await cld.api.delete_resources(chunk, {
        resource_type: 'image',
        invalidate: true,
      })) as { deleted?: Record<string, string> }

      for (const id of chunk) {
        const state = result.deleted?.[id]
        if (state === 'deleted') deleted.push(id)
        else if (state === 'not_found') missing.push(id)
        else failed.push(id)
      }
    } catch (error) {
      log.error('cloudinary', 'delete_resources basarisiz', {
        count: chunk.length,
        error: error instanceof Error ? error.message : 'bilinmeyen hata',
      })
      failed.push(...chunk)
    }
  }
  return { deleted, missing, failed }
}

/** Tek bir kaynagi siler; hata firlatmaz. */
export async function deleteResourceSafe(publicId: string): Promise<boolean> {
  const { deleted, missing } = await deleteResources([publicId])
  return deleted.length + missing.length > 0
}

/**
 * Verilen public_id listesi icin Cloudinary'nin urettigi ZIP adresini dondurur.
 *
 * NEDEN BU YONTEM: Arsiv Cloudinary tarafinda olusturulur; Vercel fonksiyonu
 * hicbir zaman goruntuleri bellege almaz. Bu, sunucusuz bellek/sure limitleri
 * icin en guvenli yaklasimdir.
 *
 * SINIRLAR (README'de de belirtilmistir):
 *  - Tek arsivde en fazla 1000 kaynak; bu yuzden cagiran taraf parcalar.
 *  - Ucretsiz planda arsiv olusturma islem kotasindan dusulur.
 */
export function archiveDownloadUrl(publicIds: string[], archiveName: string): string {
  const cld = getCloudinary()
  return cld.utils.download_zip_url({
    public_ids: publicIds,
    resource_type: 'image',
    target_public_id: archiveName,
    flatten_folders: true,
    use_original_filename: true,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 30,
  })
}

/** IP adresini dogrudan saklamamak icin kisa, tuzlanmis ozet uretir. */
export function hashIp(ip: string): string {
  return createHash('sha256')
    .update(ip + serverEnv().AUTH_SECRET)
    .digest('hex')
    .slice(0, 32)
}

/** Orijinal (sikistirilmis) goruntunun kalici adresi. */
export function originalUrl(publicId: string, format: string): string {
  return `https://res.cloudinary.com/${cloudName()}/image/upload/${publicId}.${format}`
}
