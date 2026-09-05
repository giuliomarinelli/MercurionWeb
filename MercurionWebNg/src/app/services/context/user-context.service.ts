import { computed, inject, Injectable } from '@angular/core'
import { AuthStateStore } from '../auth-state.store'

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private readonly authState = inject(AuthStateStore)
  readonly initials = this.authState.initials
  readonly isLoggedIn = this.authState.isAuthenticated
  readonly isLoggedOut = computed(() => !this.authState.isAuthenticated())

  setInitials(initials: string): void {
    this.authState.resumeFromServer(initials)
  }

  clearInitials(): void {
    this.authState.invalidate('client-cleared')
  }

  logout(): void {
    this.authState.logout()
  }
}
