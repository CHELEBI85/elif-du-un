import { z } from 'zod'
import {
  ALLOWED_UPLOAD_FORMATS,
  MAX_PHOTOS_PER_BATCH,
  MAX_UPLOAD_FILE_BYTES,
} from './constants'

/** Misafir oturum kimliği — istemci üretir, sunucu biçimini doğrular. */
export const sessionIdSchema = z
  .string()
  .min(8)
  .max(64)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Geçersiz oturum kimliği')

export const slugSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Geçersiz bağlantı adresi')

/** POST /api/cloudinary/sign gövdesi. */
export const signRequestSchema = z.object({
  slug: slugSchema,
  sessionId: sessionIdSchema,
  count: z.number().int().min(1).max(MAX_PHOTOS_PER_BATCH),
})

/** POST /api/photos gövdesi — Cloudinary yanıtından türetilir. */
export const createPhotoSchema = z.object({
  slug: slugSchema,
  sessionId: sessionIdSchema,
  publicId: z.string().min(3).max(300),
  version: z.number().int().positive().optional(),
  format: z.enum(ALLOWED_UPLOAD_FORMATS),
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
  bytes: z.number().int().min(1).max(MAX_UPLOAD_FILE_BYTES),
  originalFilename: z.string().max(255).optional().nullable(),
})

export const bulkDeleteSchema = z.object({
  photoIds: z.array(z.string().min(1).max(64)).min(1).max(500),
})

export const loginSchema = z.object({
  email: z.string().email('Geçerli bir e-posta adresi girin'),
  password: z.string().min(1, 'Şifre gerekli'),
})

export const eventSettingsSchema = z.object({
  coupleName: z.string().min(2, 'Çift adı gerekli').max(120),
  title: z.string().min(2, 'Başlık gerekli').max(160),
  brideName: z.string().min(2, 'Gelin adı gerekli').max(120),
  groomName: z.string().min(2, 'Damat adı gerekli').max(120),
  slug: slugSchema,
  eventDate: z
    .string()
    .optional()
    .transform((v) => (v && v.trim().length > 0 ? v : null))
    .refine((v) => v === null || !Number.isNaN(Date.parse(v)), 'Geçersiz tarih'),
  retentionDays: z.coerce.number().int().min(1, 'En az 1 gün').max(365, 'En fazla 365 gün'),
  uploadEnabled: z.boolean(),
})

export const createEventSchema = eventSettingsSchema

export type SignRequest = z.infer<typeof signRequestSchema>
export type CreatePhotoInput = z.infer<typeof createPhotoSchema>
export type EventSettingsInput = z.infer<typeof eventSettingsSchema>
