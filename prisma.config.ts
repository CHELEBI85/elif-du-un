// Prisma 7'de `package.json#prisma` kaldirilacagi icin yapilandirma buraya tasindi.
// Not: prisma.config.ts kullanildiginda Prisma .env dosyasini otomatik yuklemez,
// bu yuzden dotenv'i acikca yukluyoruz.
import 'dotenv/config'
import path from 'node:path'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
})
