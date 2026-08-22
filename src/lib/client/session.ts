'use client'

/**
 * Hesapsız misafirler için anonim yükleme oturumu.
 * Kişisel hiçbir veri toplanmaz; bu kimlik yalnızca kötüye kullanım koruması,
 * yükleme sayacı ve sorun giderme içindir.
 */
const STORAGE_KEY = 'uploaderSessionId'

function createId(): string {
  // Safari 15.3 ve öncesinde randomUUID yok; getRandomValues her yerde var.
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export function getUploaderSessionId(): string {
  if (typeof window === 'undefined') return ''
  try {
    const existing = window.localStorage.getItem(STORAGE_KEY)
    if (existing && /^[a-zA-Z0-9_-]{8,64}$/.test(existing)) return existing
    const fresh = createId()
    window.localStorage.setItem(STORAGE_KEY, fresh)
    return fresh
  } catch {
    // Gizli sekme veya depolama kapalı: oturum bellekte kalır.
    return createId()
  }
}
