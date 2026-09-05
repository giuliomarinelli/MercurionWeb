import { computed, Injectable, OnDestroy, signal } from '@angular/core'
import { ToastContext, ToastNotification, ToastState } from '../Models/toast.models'

const HIDDEN_TOAST_STATE: ToastState = {
  phase: 'hidden',
  notification: null
}

@Injectable({ providedIn: 'root' })
export class ToastService implements OnDestroy {
  private readonly _state = signal<ToastState>(HIDDEN_TOAST_STATE)

  private _slideInTimeoutId: ReturnType<typeof setTimeout> | undefined
  private _autoDismissTimeoutId: ReturnType<typeof setTimeout> | undefined
  private _hideTimeoutId: ReturnType<typeof setTimeout> | undefined

  readonly state = this._state.asReadonly()
  readonly show = computed(() => this._state().phase !== 'hidden')
  readonly slideIn = computed(() => this._state().phase === 'visible')
  readonly message = computed(() => this._state().notification?.message ?? '')
  readonly context = computed(() => this._state().notification?.context ?? 'error')

  trigger(message: string, context: ToastContext = 'error', duration = 5000): void {
    if (this._state().phase !== 'hidden') return

    this.clearTimers()

    const notification: ToastNotification = { message, context }
    this._state.set({ phase: 'entering', notification })

    this._slideInTimeoutId = setTimeout(() => {
      this._slideInTimeoutId = undefined
      const currentState = this._state()
      if (currentState.phase === 'entering' && currentState.notification === notification) {
        this._state.set({ phase: 'visible', notification })
      }
    }, 30)

    this._autoDismissTimeoutId = setTimeout(() => {
      this._autoDismissTimeoutId = undefined
      this.close()
    }, duration)
  }

  close(): void {
    const currentState = this._state()
    this.clearTimers()

    if (currentState.phase === 'hidden') return

    this._state.set({
      phase: 'leaving',
      notification: currentState.notification
    })
    this._hideTimeoutId = setTimeout(() => {
      this._hideTimeoutId = undefined
      this._state.set(HIDDEN_TOAST_STATE)
    }, 300)
  }

  private clearTimers(): void {
    if (this._slideInTimeoutId !== undefined) clearTimeout(this._slideInTimeoutId)
    if (this._autoDismissTimeoutId !== undefined) clearTimeout(this._autoDismissTimeoutId)
    if (this._hideTimeoutId !== undefined) clearTimeout(this._hideTimeoutId)
    this._slideInTimeoutId = undefined
    this._autoDismissTimeoutId = undefined
    this._hideTimeoutId = undefined
  }

  ngOnDestroy(): void {
    this.clearTimers()
  }
}