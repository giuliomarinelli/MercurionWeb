import { Injectable, signal } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class RealtimeSyncStatusService {
  private readonly _visible = signal(false)
  readonly visible = this._visible.asReadonly()
  private timer?: ReturnType<typeof setTimeout>

  markSynchronized(durationMs = 2600): void {
    if (this.timer) clearTimeout(this.timer)
    this._visible.set(true)
    this.timer = setTimeout(() => {
      this.timer = undefined
      this._visible.set(false)
    }, durationMs)
  }

  clear(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = undefined
    this._visible.set(false)
  }
}
