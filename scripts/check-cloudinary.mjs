/**
 * Cloudinary bilgilerini hizli dogrulama araci.
 *
 * Calistirma:  npm run check:cloudinary
 *
 * Sirlari asla ekrana yazmaz; yalnizca maskelenmis ozet ve Cloudinary'nin
 * dondugu hata mesajini gosterir.
 */
import 'dotenv/config'

const mask = (v) => (v ? `${v.length} karakter (${v.slice(0, 3)}***${v.slice(-2)})` : 'TANIMSIZ')

async function main() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim()
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim()
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim()

  console.log('Cloudinary yapilandirmasi')
  console.log('  cloud_name :', cloudName || 'TANIMSIZ')
  console.log('  api_key    :', mask(apiKey))
  console.log('  api_secret :', mask(apiSecret))
  console.log('')

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('BASARISIZ — Uc degiskenin ucu de .env icinde tanimli olmali.')
    return 1
  }

  const auth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')

  let response
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/ping`, {
      headers: { Authorization: `Basic ${auth}` },
    })
  } catch (error) {
    console.error('AG HATASI —', error instanceof Error ? error.message : error)
    return 1
  }

  if (response.ok) {
    console.log('BASARILI — Cloudinary baglantisi calisiyor.')
    return 0
  }

  const body = await response.json().catch(() => ({}))
  const message = body?.error?.message ?? `HTTP ${response.status}`
  console.error(`BASARISIZ — ${message}`)
  console.error('')

  if (/cloud_name/i.test(message)) {
    console.error('cloud_name yanlis. Cloudinary konsolunda API Keys sayfasinin')
    console.error('ustundeki "Cloud name" rozetine bakin. DIKKAT: tablodaki')
    console.error('"Key Name" sutunu (ornegin "Root") cloud_name DEGILDIR.')
    console.error('')
    console.error('Alternatif olarak su satirda @ isaretinden sonraki kisim:')
    console.error('  CLOUDINARY_URL=cloudinary://<api_key>:<api_secret>@<CLOUD_NAME>')
  } else if (/api_secret/i.test(message)) {
    console.error('api_secret yanlis. Konsoldan yeniden kopyalayin.')
  } else if (/api_key/i.test(message)) {
    console.error('api_key yanlis. Konsoldan yeniden kopyalayin.')
  }

  return 1
}

process.exitCode = await main()
