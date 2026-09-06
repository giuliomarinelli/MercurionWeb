import { computed, inject, Injectable } from '@angular/core'
import { AuthStateStore } from '../auth-state.store'
import { SessionInvalidationCause } from '@mercurion/rest-contracts'

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
    this.authState.invalidate(SessionInvalidationCause.InvalidSession)
  }

  logout(): void {
    this.authState.logout()
  }
}
