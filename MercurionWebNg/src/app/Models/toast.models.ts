export type ToastVariant = 'error' | 'warn' | 'success'

export interface ToastMessage {
  id: string
  message: string
  variant: ToastVariant
  durationMs: number
  createdAt: number
}
