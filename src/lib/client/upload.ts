'use client'

import { messages } from '@/lib/messages'

export interface UploadTicket {
  publicId: string
  timestamp: number
  signature: string
  apiKey: string
  uploadUrl: string
}

export interface SignResponse {
  tickets: UploadTicket[]
}

export class UploadError extends Error {
  readonly retryable: boolean
  constructor(message: string, retryable = true) {
    super(message)
    this.name = 'UploadError'
    this.retryable = retryable
  }
}

interface ApiError {
  error?: string
  code?: string
}

/** Sunucudan istenen sayıda tek kullanımlık yükleme izni alır. */
export async function requestTickets(
  slug: string,
  sessionId: string,
  count: number,
  signal?: AbortSignal,
): Promise<UploadTicket[]> {
  let response: Response
  try {
    response = await fetch('/api/cloudinary/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, sessionId, count }),
      signal,
    })
  } catch {
    throw new UploadError(messages.errors.network)
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError
    const retryable = response.status >= 500 || response.status === 429
    throw new UploadError(body.error ?? messages.errors.server, retryable)
  }

  const data = (await response.json()) as SignResponse
  return data.tickets
}

interface CloudinaryUploadResponse {
  public_id: string
  secure_url: string
  format: string
  width: number
  height: number
  bytes: number
  version: number
}

/**
 * Dosyayı doğrudan Cloudinary'ye yükler.
 * fetch yerine XMLHttpRequest kullanılır — gerçek ilerleme yüzdesi için
 * `upload.onprogress` olayına ihtiyacımız var.
 */
function uploadToCloudinary(
  file: File,
  ticket: UploadTicket,
  onProgress: (percent: number) => void,
  signal?: AbortSignal,
): Promise<CloudinaryUploadResponse> {
  return new Promise((resolve, reject) => {
    const form = new FormData()
    form.append('file', file)
    form.append('api_key', ticket.apiKey)
    form.append('timestamp', String(ticket.timestamp))
    form.append('public_id', ticket.publicId)
    form.append('signature', ticket.signature)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', ticket.uploadUrl, true)
    xhr.timeout = 120_000

    const abort = () => xhr.abort()
    signal?.addEventListener('abort', abort, { once: true })

    const cleanup = () => signal?.removeEventListener('abort', abort)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        // %99'da bırak; %100'ü sunucu kaydı tamamlanınca veriyoruz.
        onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)))
      }
    }

    xhr.onload = () => {
      cleanup()
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as CloudinaryUploadResponse)
        } catch {
          reject(new UploadError(messages.errors.uploadFailed))
        }
      } else {
        reject(new UploadError(messages.errors.uploadFailed, xhr.status !== 400))
      }
    }
    xhr.onerror = () => {
      cleanup()
      reject(new UploadError(messages.errors.network))
    }
    xhr.ontimeout = () => {
      cleanup()
      reject(new UploadError(messages.errors.network))
    }
    xhr.onabort = () => {
      cleanup()
      reject(new UploadError('İptal edildi', false))
    }

    xhr.send(form)
  })
}

/** Cloudinary yüklemesi bittikten sonra üst veriyi veritabanına kaydeder. */
async function persistPhoto(
  slug: string,
  sessionId: string,
  result: CloudinaryUploadResponse,
  originalFilename: string,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response
  try {
    response = await fetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug,
        sessionId,
        publicId: result.public_id,
        version: result.version,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
        originalFilename: originalFilename.slice(0, 255),
      }),
      signal,
    })
  } catch {
    throw new UploadError(messages.errors.network)
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as ApiError
    throw new UploadError(body.error ?? messages.errors.server, response.status >= 500)
  }
}

export interface UploadJob {
  id: string
  file: File
  ticket: UploadTicket
}

export interface UploadOutcome {
  id: string
  ok: boolean
  error?: string
}

/**
 * İşleri sınırlı eşzamanlılıkla çalıştırır.
 * 20 büyük fotoğrafı aynı anda göndermek mobil bağlantıyı tıkar; bu yüzden
 * aynı anda yalnızca birkaç yükleme açık tutulur.
 */
export async function runUploads(
  jobs: UploadJob[],
  options: {
    slug: string
    sessionId: string
    concurrency: number
    onProgress: (id: string, percent: number) => void
    onSettled: (outcome: UploadOutcome) => void
    signal?: AbortSignal
  },
): Promise<UploadOutcome[]> {
  const { slug, sessionId, concurrency, onProgress, onSettled, signal } = options
  const outcomes: UploadOutcome[] = []
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < jobs.length) {
      if (signal?.aborted) return
      const job = jobs[cursor++]
      if (!job) return

      let outcome: UploadOutcome
      try {
        const result = await uploadToCloudinary(job.file, job.ticket, (p) => onProgress(job.id, p), signal)
        await persistPhoto(slug, sessionId, result, job.file.name, signal)
        onProgress(job.id, 100)
        outcome = { id: job.id, ok: true }
      } catch (error) {
        outcome = {
          id: job.id,
          ok: false,
          error: error instanceof UploadError ? error.message : messages.errors.uploadFailed,
        }
      }
      outcomes.push(outcome)
      onSettled(outcome)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, jobs.length) }, () => worker())
  await Promise.all(workers)
  return outcomes
}
