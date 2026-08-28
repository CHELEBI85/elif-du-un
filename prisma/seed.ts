/**
 * Başlangıç verisi.
 *
 * Çalıştırma:  npm run db:seed
 *
 * Yeniden çalıştırılabilir (idempotent): var olan kayıtlar güncellenir,
 * yenisi oluşturulmaz.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const RETENTION_DAYS = 7

const EVENT = {
  slug: 'elif-aydin-yunus-emre-kapukaya',
  title: 'Elif Aydın & Yunus Emre Kapukaya',
  coupleName: 'Elif & Yunus Emre',
  brideName: 'Elif Aydın',
  groomName: 'Yunus Emre Kapukaya',
} as const

async function main() {
  const username = process.env.SEED_ADMIN_USERNAME?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!username || !password) {
    throw new Error(
      'SEED_ADMIN_USERNAME ve SEED_ADMIN_PASSWORD ortam degiskenleri gerekli. ' +
        '.env dosyaniza ekleyip tekrar deneyin.',
    )
  }
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error(
      'SEED_ADMIN_USERNAME 3-32 karakter olmali ve yalnizca harf, rakam, nokta, ' +
        'alt cizgi veya tire icermeli.',
    )
  }
  if (password.length < 10) {
    throw new Error('SEED_ADMIN_PASSWORD en az 10 karakter olmali.')
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash },
    create: { username, passwordHash, name: 'Etkinlik Sahibi' },
  })

  // Dugun tarihi bilinmiyor: admin panelinden girilecek.
  //
  // SAKLAMA: Varsayilan olarak SURESIZ (expiresAt = null). Boylece fotograflar
  // otomatik silinmez ve yukleme hicbir zaman kapanmaz. Sureli saklamaya
  // gecmek icin panelden "Suresiz sakla" anahtarini kapatmak yeterli;
  // RETENTION_DAYS o zaman baslangic degeri olarak kullanilir.
  const expiresAt = null

  const event = await prisma.event.upsert({
    where: { slug: EVENT.slug },
    update: {
      title: EVENT.title,
      coupleName: EVENT.coupleName,
      brideName: EVENT.brideName,
      groomName: EVENT.groomName,
    },
    create: {
      ...EVENT,
      retentionDays: RETENTION_DAYS,
      uploadEnabled: true,
      status: 'ACTIVE',
      expiresAt,
    },
  })

  console.log('Yonetici hazir :', user.username)
  console.log('Etkinlik hazir :', event.coupleName)
  console.log('Misafir adresi :', `/w/${event.slug}`)
  console.log('Saklama       :', event.expiresAt ? `${event.retentionDays} gun` : 'suresiz')
}

main()
  .catch((error: unknown) => {
    console.error('Seed basarisiz:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
