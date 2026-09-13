/**
 * ready     → seçildi, gönderilmeyi bekliyor
 * queued    → gönderim başladı, sırasını bekliyor
 * uploading → hazırlanıyor / yükleniyor
 */
export type PhotoStatus = 'ready' | 'queued' | 'uploading' | 'done' | 'error'

export interface SelectedPhoto {
  id: string
  /** Tarayıcının verdiği orijinal dosya; sıkıştırma yükleme anında yapılır. */
  file: File
  /** Aynı fotoğrafın iki kez seçilmesini engellemek için anahtar. */
  key: string
  name: string
  status: PhotoStatus
  progress: number
  error?: string
}

export interface RejectedPhoto {
  name: string
  reason: string
}
