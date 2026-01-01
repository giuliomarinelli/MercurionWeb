import { ToastContext } from "../components/common/toast/toast.component"

export type CopyPayload =
  | string
  | number
  | boolean
  | null
  | undefined
  | object

export interface CopyUiOptions {
  // comportamento “core”
  refuseEmpty?: boolean
  stringify?: (value: CopyPayload) => string

  // toast (opzionale)
  showToast?: boolean
  successMessage?: string
  errorMessage?: string
  successContext?: ToastContext
  errorContext?: ToastContext
  durationMs?: number
  forceToast?: boolean
}

export interface CopyOptions {
  /**
   * Trasforma l'oggetto in stringa. Default: JSON pretty per object, String() per primitive.
   */
  stringify?: (value: CopyPayload) => string
  /**
   * Hook opzionale per mostrare un feedback UI (snackbar/toast).
   */
  onSuccess?: (text: string) => void
  onError?: (err: unknown) => void
  /**
   * Se true, evita di copiare stringhe vuote/spazi.
   */
  refuseEmpty?: boolean
}
