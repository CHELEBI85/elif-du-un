/** İnsan tarafından okunabilir biçimlendirme yardımcıları. */

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatBytes(bytes: number, fractionDigits = 2): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  const unit = BYTE_UNITS[exponent] ?? 'B'
  const digits = exponent === 0 ? 0 : fractionDigits
  return `${value.toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })} ${unit}`
}

export function formatCount(value: number): string {
  return value.toLocaleString('tr-TR')
}

export function formatDate(date: Date | string | null | undefined): string {
  const d = toDate(date)
  if (!d) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

export function formatDateTime(date: Date | string | null | undefined): string {
  const d = toDate(date)
  if (!d) return '—'
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

/** Hero bölümünde kullanılan ince, dekoratif tarih biçimi. */
export function formatWeddingDate(date: Date | string | null | undefined): string | null {
  const d = toDate(date)
  if (!d) return null
  return new Intl.DateTimeFormat('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
}

/** "6 gün kaldı" / "Süresi doldu" gibi kalan süre metni. */
export function formatRemaining(expiresAt: Date | string | null | undefined): string {
  const d = toDate(expiresAt)
  if (!d) return 'Süresiz'
  const ms = d.getTime() - Date.now()
  if (ms <= 0) return 'Süresi doldu'
  const days = Math.floor(ms / 86_400_000)
  if (days >= 1) return `${days} gün kaldı`
  const hours = Math.floor(ms / 3_600_000)
  if (hours >= 1) return `${hours} saat kaldı`
  const minutes = Math.max(1, Math.floor(ms / 60_000))
  return `${minutes} dakika kaldı`
}

/** Kalan sürenin gün cinsinden tam sayısı (istatistik kartları için). */
export function daysRemaining(expiresAt: Date | string | null | undefined): number | null {
  const d = toDate(expiresAt)
  if (!d) return null
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000))
}

/** `<input type="date">` için yyyy-MM-dd biçimi. */
export function toDateInputValue(date: Date | string | null | undefined): string {
  const d = toDate(date)
  if (!d) return ''
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString()
  return iso.slice(0, 10)
}

const TURKISH_CHAR_MAP: Record<string, string> = {
  ç: 'c',
  Ç: 'c',
  ğ: 'g',
  Ğ: 'g',
  ı: 'i',
  İ: 'i',
  ö: 'o',
  Ö: 'o',
  ş: 's',
  Ş: 's',
  ü: 'u',
  Ü: 'u',
}

/** Türkçe karakterleri doğru karşılıklarına çevirerek güvenli bir slug üretir. */
export function slugify(input: string): string {
  return input
    .split('')
    .map((ch) => TURKISH_CHAR_MAP[ch] ?? ch)
    .join('')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null
  const d = typeof value === 'string' ? new Date(value) : value
  return Number.isNaN(d.getTime()) ? null : d
}
