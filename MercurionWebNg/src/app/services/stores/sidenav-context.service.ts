import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidenavContextService {

  // Stato logico
  private _isOpen = signal(true)

  // Stati visivi
  isMounted = signal(true)
  isVisible = signal(true)

  constructor() {
    effect(() => {
      if (this._isOpen()) {
        this.isMounted.set(true)
        setTimeout(() => this.isVisible.set(true), 10)
      } else {
        this.isVisible.set(false)
        setTimeout(() => this.isMounted.set(false), 300)
      }
    })
  }

  open() {
    this._isOpen.set(true)
  }

  close() {
    this._isOpen.set(false)
  }

  toggle() {
    this._isOpen.update(v => !v)
  }

  isOpen = this._isOpen.asReadonly()
}
