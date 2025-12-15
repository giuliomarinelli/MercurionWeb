import { Injectable, signal, effect, computed } from '@angular/core'
import { ActionScope } from '../../../Models/action/action-overlay.models'

@Injectable({ providedIn: 'root' })
export class ActionOverlayContextService {

  private _isOpened = signal(false)
  private _isMounted = signal(false)
  private _isVisible = signal(false)
  private _scope = signal<ActionScope>('')

  private _pendingScope = signal<ActionScope>('')

  readonly isOpened = this._isOpened.asReadonly()
  readonly isVisible = this._isVisible.asReadonly()
  readonly isMounted = this._isMounted.asReadonly()
  readonly scope = this._scope.asReadonly()
  readonly pendingScope = this._pendingScope.asReadonly()

  readonly shouldMount = computed(() => this._isMounted() || !!this._pendingScope())

  private showTimer: ReturnType<typeof setTimeout> | null = null
  private unmountTimer: ReturnType<typeof setTimeout> | null = null
  private clearScopeTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    effect(() => {
      const opened = this._isOpened()

      if (opened) {
        if (this.unmountTimer) clearTimeout(this.unmountTimer)
        if (this.clearScopeTimer) clearTimeout(this.clearScopeTimer)

        this._isMounted.set(true)

        if (this.showTimer) clearTimeout(this.showTimer)
        this.showTimer = setTimeout(() => this._isVisible.set(true), 10)
      } else {
        if (this.showTimer) clearTimeout(this.showTimer)

        this._isVisible.set(false)

        if (this.unmountTimer) clearTimeout(this.unmountTimer)
        this.unmountTimer = setTimeout(() => this._isMounted.set(false), 300)
      }
    })

    effect(() => {
      const pending = this._pendingScope()

      if (!pending) return

      this._pendingScope.set('')
      this._scope.set(pending)
      this._isOpened.set(true)
    })
  }

  open(scope: ActionScope) {
    if (!scope) return
    this._pendingScope.set(scope)
  }

  close() {
    this._isOpened.set(false)

    if (this.clearScopeTimer) clearTimeout(this.clearScopeTimer)
    this.clearScopeTimer = setTimeout(() => this._scope.set(''), 500)
  }

  switchToScope(scope: ActionScope) {
    if (!scope) return
    this._scope.set(scope)
  }
}
