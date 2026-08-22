export type PhotoStatus = 'ready' | 'uploading' | 'done' | 'error'

export interface SelectedPhoto {
  id: string
  file: File
  previewUrl: string
  name: string
  size: number
  status: PhotoStatus
  progress: number
  error?: string
}

export interface RejectedPhoto {
  name: string
  reason: string
}
