/**
 * Ürün genelinde paylaşılan limitler ve sabitler.
 * Hem istemci hem sunucu tarafından import edilebilir (sır içermez).
 */

/** Tek seferde seçilebilecek en fazla fotoğraf. */
export const MAX_PHOTOS_PER_BATCH = 300

/**
 * Tek imza isteğinde üretilecek en fazla yükleme izni.
 * İzinler toplu değil, yükleme ilerledikçe bu boyutta parçalar hâlinde
 * alınır: 300 fotoğrafın izni en başta alınsaydı yavaş bağlantıda yükleme
 * bitmeden izinlerin süresi dolardı.
 */
export const TICKETS_PER_REQUEST = 20

/** Sıkıştırmadan önce kabul edilen en büyük orijinal dosya boyutu. */
export const MAX_ORIGINAL_FILE_BYTES = 15 * 1024 * 1024 // 15 MB

/** Sıkıştırma sonrası sunucunun kabul edeceği üst sınır (güvenlik payı ile). */
export const MAX_UPLOAD_FILE_BYTES = 12 * 1024 * 1024 // 12 MB

/** Bir misafir oturumunun tek etkinlikte yükleyebileceği toplam fotoğraf. */
export const MAX_PHOTOS_PER_SESSION = 1000

/** Aynı anda çalışacak yükleme sayısı — mobil bağlantıyı boğmamak için. */
export const UPLOAD_CONCURRENCY = 3

/** İstemci tarafı sıkıştırma hedefleri. */
export const COMPRESSION = {
  /** Uzun kenar üst sınırı. */
  maxDimension: 2000,
  /** JPEG kalitesi — indirilen fotoğrafların hâlâ iyi görünmesi için yüksek tutulur. */
  quality: 0.82,
  /** Hedeflenen üst sınır; kütüphane bu değere yaklaşmaya çalışır. */
  targetMaxBytes: 1.2 * 1024 * 1024,
  /** Bu boyutun altındaki dosyalara hiç dokunulmaz. */
  skipBelowBytes: 600 * 1024,
} as const

/** Doğrudan desteklenen MIME tipleri. */
export const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'] as const

/** iPhone cihazların ürettiği, tarayıcıda JPEG'e çevrilmeye çalışılacak formatlar. */
export const HEIC_MIME_TYPES = ['image/heic', 'image/heif'] as const

/** Dosya seçicinin kabul edeceği uzantılar. */
export const ACCEPTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'] as const

/** input[accept] değeri. */
export const FILE_INPUT_ACCEPT =
  'image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif'

/** Sunucunun kabul ettiği Cloudinary format değerleri. */
export const ALLOWED_UPLOAD_FORMATS = ['jpg', 'jpeg', 'png', 'webp'] as const

/** Varsayılan saklama süresi (gün). */
export const DEFAULT_RETENTION_DAYS = 7

/** Yükleme imzasının geçerlilik süresi. */
export const SIGNATURE_TTL_SECONDS = 30 * 60 // 30 dakika (Cloudinary imzaları 1 saatte bayatlar)

/** Cloudinary klasör düzeni. Veritabanı yine de tek doğruluk kaynağıdır. */
export const cloudinaryFolders = {
  /** Misafir fotoğrafları — süresi dolunca otomatik silinir. */
  guestPhotos: (eventId: string) => `weddings/${eventId}/photos`,
  /** Kapak görseli — temizlik işi buraya asla dokunmaz. */
  assets: (eventId: string) => `wedding-assets/${eventId}`,
} as const
