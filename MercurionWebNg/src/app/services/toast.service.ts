// toast.service.ts
import { Injectable, OnDestroy, signal } from '@angular/core';
import { ToastContext } from '../components/common/toast/toast.component';

@Injectable({ providedIn: 'root' })
export class ToastService implements OnDestroy {
  private _show = signal(false)
  private _slideIn = signal(false)
  private _message = signal<string>('')
  private _context = signal<ToastContext>('error')

  private _slideInTimeoutId: ReturnType<typeof setTimeout> | undefined
  private _autoDismissTimeoutId: ReturnType<typeof setTimeout> | undefined
  private _hideTimeoutId: ReturnType<typeof setTimeout> | undefined

  readonly show = this._show.asReadonly()
  readonly slideIn = this._slideIn.asReadonly()
  readonly message = this._message.asReadonly()
  readonly context = this._context.asReadonly()

  trigger(message: string, context: ToastContext = 'error', duration = 5000): void {
    if (this._show()) return; // ignora se già visibile

    // Un nuovo trigger deve sempre annullare ogni timer residuo del ciclo
    // precedente: altrimenti un vecchio timer di slide-in/hide/auto-dismiss
    // può richiudere o far lampeggiare un toast appena aperto.
    this.clearTimers()

    this._context.set(context)
    this._message.set(message)
    this._show.set(true)

    // animazione slide-in
    this._slideInTimeoutId = setTimeout(() => this._slideIn.set(true), 30)

    // auto-dismiss
    this._autoDismissTimeoutId = setTimeout(() => {
      this.close()
      this._context.set('error')
    }, duration)
  }

  close(): void {
    // Annulla lo slide-in/auto-dismiss/hide pendenti: una close() manuale non
    // deve lasciare un vecchio timer in grado di riaprire/richiudere lo stato.
    this.clearTimers()

    this._slideIn.set(false)
    this._hideTimeoutId = setTimeout(() => this._show.set(false), 300) // lascia finire animazione
  }

  private clearTimers(): void {
    clearTimeout(this._slideInTimeoutId)
    clearTimeout(this._autoDismissTimeoutId)
    clearTimeout(this._hideTimeoutId)
    this._slideInTimeoutId = undefined
    this._autoDismissTimeoutId = undefined
    this._hideTimeoutId = undefined
  }

  ngOnDestroy(): void {
    this.clearTimers()
  }
}