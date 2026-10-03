export type ToastVariant = 'error' | 'warn' | 'success' | 'info'

export interface ToastAction {
  label: string
  run: () => void
}

export interface ToastMessage {
  id: string
  message: string
  variant: ToastVariant
  durationMs: number
  createdAt: number
  action?: ToastAction
}
