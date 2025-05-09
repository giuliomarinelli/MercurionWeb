// toast.service.ts
import { Injectable, signal } from '@angular/core';
import { ToastContext } from '../components/common/toast/toast.component';

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _show = signal(false)
  private _slideIn = signal(false)
  private _message = signal<string>('')
  private _timeoutId: any
  private _context = signal<ToastContext>('error')

  readonly show = this._show.asReadonly()
  readonly slideIn = this._slideIn.asReadonly()
  readonly message = this._message.asReadonly()
  readonly context = this._context.asReadonly()

  trigger(message: string, context: ToastContext = 'error', duration = 5000): void {
    if (this._show()) return; // ignora se già visibile
    this._context.set(context)
    this._message.set(message)
    this._show.set(true)
    // animazione slide-in
    setTimeout(() => this._slideIn.set(true), 30)

    // auto-dismiss
    clearTimeout(this._timeoutId);
    this._timeoutId = setTimeout(() => {
      this.close()
      this._context.set('error')
    }, duration)
  }

  close(): void {
    this._slideIn.set(false)
    setTimeout(() => this._show.set(false), 300) // lascia finire animazione
  }
}
