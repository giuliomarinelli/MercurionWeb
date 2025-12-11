import { Injectable, signal, effect, inject } from '@angular/core';
import { ActionScope } from '../../../Models/action/action-overlay.models';


@Injectable({ providedIn: 'root' })
export class ActionOverlayContextService {

  private _isOpened = signal<boolean>(false)
  private _isMounted = signal<boolean>(false)
  private _isVisible = signal<boolean>(false)
  private _scope = signal<ActionScope>('')

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
  }

  open(scope: ActionScope) {
    this._scope.set(scope)
    this._isOpened.set(true)
  }

  close() {
    queueMicrotask(() => {
      this._isOpened.set(false)
      setTimeout(() => this._scope.set(''), 500)
    })
  }

  switchToScope(scope: ActionScope): void {
    queueMicrotask(() => {
      this._scope.set(scope)
    })
  }

}
