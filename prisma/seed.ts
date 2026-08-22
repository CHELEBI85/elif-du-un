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
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SEED_ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error(
      'SEED_ADMIN_EMAIL ve SEED_ADMIN_PASSWORD ortam degiskenleri gerekli. ' +
        '.env dosyaniza ekleyip tekrar deneyin.',
    )
  }
  if (password.length < 10) {
    throw new Error('SEED_ADMIN_PASSWORD en az 10 karakter olmali.')
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash, name: 'Etkinlik Sahibi' },
  })

  // Dugun tarihi bilinmiyor: admin panelinden girilecek.
  // Tarih girilene kadar saklama suresi olusturulma tarihinden sayilir.
  const existing = await prisma.event.findUnique({ where: { slug: EVENT.slug } })
  const createdAt = existing?.createdAt ?? new Date()
  const base = existing?.eventDate ?? createdAt
  const start = new Date(base)
  start.setHours(23, 59, 59, 999)
  const expiresAt = new Date(start.getTime() + RETENTION_DAYS * 86_400_000)

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

  console.log('Yonetici hazir :', user.email)
  console.log('Etkinlik hazir :', event.coupleName)
  console.log('Misafir adresi :', `/w/${event.slug}`)
  console.log('Saklama suresi :', `${event.retentionDays} gun`)
}

main()
  .catch((error: unknown) => {
    console.error('Seed basarisiz:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(() => {
    void prisma.$disconnect()
  })
