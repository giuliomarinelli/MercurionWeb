import { Injectable, OnDestroy, signal } from '@angular/core';
import { ToastMessage, ToastVariant } from '../Models/toast.models';


@Injectable({ providedIn: 'root' })
export class ToastService implements OnDestroy {

  private readonly _defaultDurationMs = 4500
  private readonly _timers = new Map<string, ReturnType<typeof setTimeout>>()
  private readonly _messagesState = signal<ToastMessage[]>([])
  readonly messages = this._messagesState.asReadonly()

  private _slideInTimeoutId: ReturnType<typeof setTimeout> | undefined
  private _autoDismissTimeoutId: ReturnType<typeof setTimeout> | undefined
  private _hideTimeoutId: ReturnType<typeof setTimeout> | undefined


  trigger(message: string, variant: ToastVariant = 'error', duration = this._defaultDurationMs): string {

    const toast: ToastMessage = {
      id: this.createId(),
      message,
      variant,
      durationMs: duration,
      createdAt: Date.now(),
    }

    this._messagesState.update((current) => [toast, ...current])

    if (toast.durationMs > 0) {
      const timer = setTimeout(() => {
        this.close(toast.id)
      }, toast.durationMs)

      this._timers.set(toast.id, timer)
    }

    return toast.id

  }

  close(id?: string): void {

    if (id) {
      const timer = this._timers.get(id)
      if (timer) {
        clearTimeout(timer)
        this._timers.delete(id)
      }
      this._messagesState.update((current) => current.filter((toast) => toast.id !== id))
      return
    }

    const timers = Array.from(this._timers.values())
    timers.forEach(clearTimeout)
    this._timers.clear()

  }

  private clearTimers(): void {
    clearTimeout(this._slideInTimeoutId)
    clearTimeout(this._autoDismissTimeoutId)
    clearTimeout(this._hideTimeoutId)
    this._timers.forEach((timer) => clearTimeout(timer))
    this._timers.clear()
    this._slideInTimeoutId = undefined
    this._autoDismissTimeoutId = undefined
    this._hideTimeoutId = undefined
  }

  ngOnDestroy(): void {
    this.clearTimers()
  }

  private createId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

}
