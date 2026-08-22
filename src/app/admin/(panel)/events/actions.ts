'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { computeExpiresAt } from '@/lib/events'
import { deleteResources } from '@/lib/cloudinary'
import { eventSettingsSchema } from '@/lib/validation'
import { messages } from '@/lib/messages'
import { log } from '@/lib/logger'

export interface EventFormState {
  error?: string
  fieldErrors?: Record<string, string>
  success?: string
}

function readForm(formData: FormData) {
  return {
    coupleName: String(formData.get('coupleName') ?? '').trim(),
    title: String(formData.get('title') ?? '').trim(),
    brideName: String(formData.get('brideName') ?? '').trim(),
    groomName: String(formData.get('groomName') ?? '').trim(),
    slug: String(formData.get('slug') ?? '').trim(),
    eventDate: String(formData.get('eventDate') ?? ''),
    retentionDays: String(formData.get('retentionDays') ?? ''),
    uploadEnabled: formData.get('uploadEnabled') === 'on',
  }
}

function collectFieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {}
  for (const issue of issues) {
    const key = String(issue.path[0] ?? '')
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message
  }
  return fieldErrors
}

export async function createEventAction(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireSession()

  const parsed = eventSettingsSchema.safeParse(readForm(formData))
  if (!parsed.success) return { fieldErrors: collectFieldErrors(parsed.error.issues) }

  const data = parsed.data
  const existing = await prisma.event.findUnique({ where: { slug: data.slug } })
  if (existing) return { fieldErrors: { slug: 'Bu bağlantı adresi zaten kullanılıyor.' } }

  const eventDate = data.eventDate ? new Date(data.eventDate) : null

  let created
  try {
    created = await prisma.event.create({
      data: {
        slug: data.slug,
        title: data.title,
        coupleName: data.coupleName,
        brideName: data.brideName,
        groomName: data.groomName,
        eventDate,
        retentionDays: data.retentionDays,
        uploadEnabled: data.uploadEnabled,
        expiresAt: computeExpiresAt(eventDate, data.retentionDays),
      },
    })
  } catch (error) {
    log.error('admin/events', 'Etkinlik oluşturulamadı', {
      error: error instanceof Error ? error.message : 'bilinmeyen hata',
    })
    return { error: messages.errors.server }
  }

  revalidatePath('/admin/events')
  revalidatePath('/admin')
  redirect(`/admin/events/${created.id}`)
}

export async function updateEventAction(
  _prev: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  await requireSession()

  const id = String(formData.get('id') ?? '')
  if (!id) return { error: messages.errors.server }

  const parsed = eventSettingsSchema.safeParse(readForm(formData))
  if (!parsed.success) return { fieldErrors: collectFieldErrors(parsed.error.issues) }

  const data = parsed.data
  const current = await prisma.event.findUnique({ where: { id } })
  if (!current) return { error: 'Etkinlik bulunamadı.' }

  if (data.slug !== current.slug) {
    const clash = await prisma.event.findUnique({ where: { slug: data.slug } })
    if (clash) return { fieldErrors: { slug: 'Bu bağlantı adresi zaten kullanılıyor.' } }
  }

  const eventDate = data.eventDate ? new Date(data.eventDate) : null
  const expiresAt = computeExpiresAt(eventDate, data.retentionDays, current.createdAt)

  // Saklama süresi uzatıldıysa süresi dolmuş etkinlik tekrar aktif olabilir.
  const status =
    current.status === 'ARCHIVED'
      ? 'ARCHIVED'
      : expiresAt.getTime() > Date.now()
        ? 'ACTIVE'
        : 'EXPIRED'

  try {
    await prisma.event.update({
      where: { id },
      data: {
        slug: data.slug,
        title: data.title,
        coupleName: data.coupleName,
        brideName: data.brideName,
        groomName: data.groomName,
        eventDate,
        retentionDays: data.retentionDays,
        uploadEnabled: data.uploadEnabled,
        expiresAt,
        status,
      },
    })
  } catch (error) {
    log.error('admin/events', 'Etkinlik güncellenemedi', {
      eventId: id,
      error: error instanceof Error ? error.message : 'bilinmeyen hata',
    })
    return { error: messages.errors.server }
  }

  revalidatePath('/admin/events')
  revalidatePath(`/admin/events/${id}`)
  revalidatePath(`/w/${data.slug}`)
  if (data.slug !== current.slug) revalidatePath(`/w/${current.slug}`)

  return { success: 'Değişiklikler kaydedildi.' }
}

/**
 * Etkinliği ve tüm fotoğraflarını kalıcı olarak siler.
 * Önce Cloudinary kaynakları temizlenir; ancak ondan sonra veritabanı kaydı
 * kaldırılır (Photo kayıtları cascade ile gider).
 */
export async function deleteEventAction(formData: FormData): Promise<void> {
  await requireSession()

  const id = String(formData.get('id') ?? '')
  if (!id) redirect('/admin/events')

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, coverPublicId: true },
  })
  if (!event) redirect('/admin/events')

  const photos = await prisma.photo.findMany({
    where: { eventId: id },
    select: { publicId: true },
  })

  const publicIds = photos.map((p) => p.publicId)
  if (event.coverPublicId) publicIds.push(event.coverPublicId)

  const { failed } = await deleteResources(publicIds)
  if (failed.length > 0) {
    log.error('admin/events', 'Etkinlik silinirken bazı kaynaklar temizlenemedi', {
      eventId: id,
      failedCount: failed.length,
    })
  }

  await prisma.event.delete({ where: { id } })

  log.info('admin/events', 'Etkinlik silindi', { eventId: id, photoCount: photos.length })

  revalidatePath('/admin/events')
  revalidatePath('/admin')
  redirect('/admin/events')
}
