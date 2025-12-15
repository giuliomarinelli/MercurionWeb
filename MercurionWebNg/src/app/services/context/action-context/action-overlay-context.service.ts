import { Injectable, signal, effect } from '@angular/core'
import { ActionScope } from '../../../Models/action/action-overlay.models'

@Injectable({ providedIn: 'root' })
export class ActionOverlayContextService {

  private _isOpened = signal<boolean>(false)
  private _isMounted = signal<boolean>(false)
  private _isVisible = signal<boolean>(false)
  private _scope = signal<ActionScope>('')

  private _pendingScope = signal<ActionScope | null>(null)

  readonly isOpened = this._isOpened.asReadonly()
  readonly isVisible = this._isVisible.asReadonly()
  readonly isMounted = this._isMounted.asReadonly()
  readonly scope = this._scope.asReadonly()

  constructor() {
    effect(() => {
      if (this.isOpened()) {
        this._isMounted.set(true)
        setTimeout(() => this._isVisible.set(true), 10)
      } else {
        this._isVisible.set(false)
        setTimeout(() => this._isMounted.set(false), 300)
      }
    })

    effect(() => {
      const mounted = this._isMounted()
      const pending = this._pendingScope()

      if (!mounted || !pending) {
        return
      }

      this._pendingScope.set(null)

      queueMicrotask(() => {
        this._scope.set(pending)
        this._isOpened.set(true)
      })
    })
  }

  open(scope: ActionScope) {
    if (!this._isMounted()) {
      this._pendingScope.set(scope)
      this._isOpened.set(true)
      return
    }

    this._scope.set(scope)
    this._isOpened.set(true)
  }

  close() {
    queueMicrotask(() => {
      this._pendingScope.set(null)
      this._isOpened.set(false)
      setTimeout(() => this._scope.set(''), 500)
    })
  }

  switchToScope(scope: ActionScope) {
    queueMicrotask(() => {
      this._scope.set(scope)
    })
  }
}
