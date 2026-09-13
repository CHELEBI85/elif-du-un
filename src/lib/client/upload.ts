'use client'

import { TICKETS_PER_REQUEST } from '@/lib/constants'
import { messages } from '@/lib/messages'
import { prepareFile } from './compress'

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
    // Oturum sınırı ve süresi dolmuş etkinlik de 429/403 döner; bunlar tekrar
    // denemeyle düzelmez. Yalnızca gerçek hız sınırı ve sunucu hataları geçicidir.
    const retryable = response.status >= 500 || body.code === 'RATE_LIMITED'
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

/**
 * Yükleme izinlerini ihtiyaç anında, küçük parçalar hâlinde alan havuz.
 *
 * Neden: 300 fotoğrafın iznini en başta almak, yavaş bir bağlantıda yükleme
 * bitmeden izinlerin süresinin dolmasına (ve sunucunun geçerli yüklemeleri
 * reddetmesine) yol açardı. Parça parça alınan izinler kullanılmadan önce
 * taze kalır.
 *
 * Aynı anda en fazla bir istek açık tutulur; bekleyen işçiler aynı isteğin
 * sonucunu paylaşır.
 */
class TicketPool {
  private buffer: UploadTicket[] = []
  private inflight: Promise<void> | null = null
  /** Bu çalıştırmayı durduran hata (oturum sınırı, süre dolumu, ağ vb.). */
  fatal: UploadError | null = null

  constructor(
    private readonly slug: string,
    private readonly sessionId: string,
    /** Hâlâ izne ihtiyacı olabilecek iş sayısı. */
    private remaining: number,
    private readonly signal?: AbortSignal,
  ) {}

  async take(): Promise<UploadTicket> {
    while (this.buffer.length === 0) {
      if (this.fatal) throw this.fatal
      if (!this.inflight) {
        const count = Math.max(1, Math.min(TICKETS_PER_REQUEST, this.remaining))
        this.inflight = requestTickets(this.slug, this.sessionId, count, this.signal)
          .then((tickets) => {
            this.buffer.push(...tickets)
          })
          .catch((error: unknown) => {
            // İzin alınamadıysa kalan işlerin her biri ayrı ayrı denemesin:
            // sunucuyu gereksiz yere yormamak için bu tur burada durur,
            // kullanıcı "Başarısızları Tekrar Dene" ile devam eder.
            this.fatal =
              error instanceof UploadError ? error : new UploadError(messages.errors.server)
          })
          .finally(() => {
            this.inflight = null
          })
      }
      await this.inflight
    }

    const ticket = this.buffer.shift()
    if (!ticket) throw new UploadError(messages.errors.server)
    this.remaining = Math.max(0, this.remaining - 1)
    return ticket
  }

  /** İzin almadan biten iş (ör. hazırlanamayan fotoğraf) sayaçtan düşülür. */
  skip(): void {
    this.remaining = Math.max(0, this.remaining - 1)
  }
}

export interface UploadJob {
  id: string
  file: File
}

export interface UploadOutcome {
  id: string
  ok: boolean
  error?: string
}

export interface UploadRunResult {
  outcomes: UploadOutcome[]
  /** Turu durduran genel hata varsa kullanıcıya gösterilecek mesaj. */
  fatalError: string | null
}

/**
 * İşleri sınırlı eşzamanlılıkla çalıştırır.
 *
 * Her fotoğraf için sırasıyla: hazırla (HEIC dönüşümü + sıkıştırma) → izin
 * al → Cloudinary'ye yükle → veritabanına kaydet. Hazırlama işçinin içinde
 * yapıldığı için bellekte aynı anda yalnızca `concurrency` kadar
 * sıkıştırılmış kopya bulunur.
 */
export async function runUploads(
  jobs: UploadJob[],
  options: {
    slug: string
    sessionId: string
    concurrency: number
    onStart: (id: string) => void
    onProgress: (id: string, percent: number) => void
    onSettled: (outcome: UploadOutcome) => void
    signal?: AbortSignal
  },
): Promise<UploadRunResult> {
  const { slug, sessionId, concurrency, onStart, onProgress, onSettled, signal } = options
  const pool = new TicketPool(slug, sessionId, jobs.length, signal)
  const outcomes: UploadOutcome[] = []
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < jobs.length) {
      if (signal?.aborted) return
      const job = jobs[cursor++]
      if (!job) return

      onStart(job.id)
      let ticketTaken = false
      let outcome: UploadOutcome

      try {
        if (pool.fatal) throw pool.fatal

        const prepared = await prepareFile(job.file)
        if (!prepared.ok) throw new UploadError(prepared.reason, false)

        const ticket = await pool.take()
        ticketTaken = true

        const result = await uploadToCloudinary(
          prepared.file,
          ticket,
          (p) => onProgress(job.id, p),
          signal,
        )
        await persistPhoto(slug, sessionId, result, job.file.name, signal)
        onProgress(job.id, 100)
        outcome = { id: job.id, ok: true }
      } catch (error) {
        if (!ticketTaken) pool.skip()
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
  return { outcomes, fatalError: pool.fatal?.message ?? null }
}
