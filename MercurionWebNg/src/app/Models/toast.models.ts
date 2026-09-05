export type ToastContext = 'error' | 'warn' | 'success'

export interface ToastNotification {
  readonly message: string
  readonly context: ToastContext
}

export type ToastState =
  | {
      readonly phase: 'hidden'
      readonly notification: null
    }
  | {
      readonly phase: 'entering' | 'visible' | 'leaving'
      readonly notification: ToastNotification
    }
