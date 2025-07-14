import { Injectable, signal } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class UserContextService {

  private _initials = signal<string>('')
  public readonly initials = this._initials.asReadonly()

  constructor() {
    const saved = localStorage.getItem('login')
    if (saved) this._initials.set(saved)
  }

  setInitials(initials: string) {
    this._initials.set(initials)
    localStorage.setItem('login', initials)
  }
  clearInitials() {
    this._initials.set('')
    localStorage.removeItem('login')
  }

  login(init: string): void {
    this.setInitials(init)
  }

  logout(): void {
    this.clearInitials()
  }

}
