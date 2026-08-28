import { computed, Injectable, signal } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class UserContextService {

  private _initials = signal<string>('')
  public readonly initials = this._initials.asReadonly()
  public readonly isLoggedIn = computed(() => this.initials() !== '')
  public readonly isLoggedOut = computed(() => Boolean(this.initials()) === false)

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

  logout(): void {
    this.clearInitials()
    localStorage.removeItem('accessToken')
    localStorage.removeItem('ws_accessToken')
    localStorage.removeItem('ws_accessToken_ts')
    for (const name of ['__logged_in', '__logged_in_']) {
      document.cookie = `${name}=; Max-Age=0; path=/`
    }
    localStorage.removeItem('scp')
  }

}
