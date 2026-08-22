import 'server-only'
import QRCode from 'qrcode'
import { appUrl } from './env'

/** Misafirlerin QR ile ulaşacağı adres. */
export function weddingUrl(slug: string): string {
  return `${appUrl()}/w/${slug}`
}

/**
 * Baskı için renk seçimi: koyu kömür üzerine sıcak beyaz.
 * Saf siyah/beyaz yerine marka tonları kullanılır ama kontrast oranı
 * tarayıcıların QR okuması için fazlasıyla yeterli tutulur.
 */
const QR_COLORS = { dark: '#24221FFF', light: '#FCFAF6FF' } as const

export async function buildQrPng(target: string, size = 1200): Promise<Buffer> {
  return QRCode.toBuffer(target, {
    type: 'png',
    width: size,
    margin: 2,
    // Yüksek hata düzeltme: kart üzerinde küçük lekeler olsa bile okunur.
    errorCorrectionLevel: 'H',
    color: QR_COLORS,
  })
}

export async function buildQrSvg(target: string): Promise<string> {
  return QRCode.toString(target, {
    type: 'svg',
    margin: 2,
    errorCorrectionLevel: 'H',
    color: QR_COLORS,
  })
}

/** Sayfa içinde göstermek için data URL. */
export async function buildQrDataUrl(target: string, size = 900): Promise<string> {
  return QRCode.toDataURL(target, {
    width: size,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: QR_COLORS,
  })
}
