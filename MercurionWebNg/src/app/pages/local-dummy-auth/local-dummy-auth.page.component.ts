import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'

import { AuthStateStore } from '../../services/auth-state.store'
import { LocalDummyAuthService } from '../../services/local-dummy-auth.service'
import { SessionSyncService } from '../../services/session-sync.service'

@Component({
  selector: 'app-local-dummy-auth-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="min-h-screen grid place-items-center p-6">
      <p role="status">{{ message() }}</p>
    </main>
  `
})
export class LocalDummyAuthPageComponent implements OnInit {
  private readonly authState = inject(AuthStateStore)
  private readonly localDummyAuth = inject(LocalDummyAuthService)
  private readonly sessionSync = inject(SessionSyncService)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)

  readonly message = signal('Attivazione autenticazione dummy locale…')

  ngOnInit(): void {
    void this.activate()
  }

  private async activate(): Promise<void> {
    try {
      if (!this.localDummyAuth.isAvailable()) {
        await this.router.navigateByUrl('/404-not-found')
        return
      }

      if (this.authState.state().kind === 'bootstrap') this.authState.bootstrap()
      const current = this.authState.state().kind
      if (current !== 'anonymous' && current !== 'authenticating' && current !== 'session-expired') {
        this.authState.logout()
      }
      if (this.authState.state().kind !== 'authenticating') {
        this.authState.beginAuthentication('restore')
      }

      this.authState.completeAuthentication(await this.localDummyAuth.activate())
      await this.sessionSync.syncSession(true)
      if (!await this.waitForAuthenticatedSession()) {
        throw new Error('The local backend did not accept dummy authentication')
      }

      const requested = this.route.snapshot.queryParamMap.get('redirect_to')
      const target = requested?.startsWith('/') && !requested.startsWith('//')
        ? requested
        : '/dashboard'
      await this.router.navigateByUrl(target)
    } catch {
      this.authState.logout()
      this.message.set('Autenticazione dummy locale non disponibile: verifica il runtime Nest locale.')
    }
  }

  private async waitForAuthenticatedSession(timeoutMs = 10_000): Promise<boolean> {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      if (this.sessionSync.currentStatus === 'loggedIn') return true
      await new Promise<void>(resolve => setTimeout(resolve, 50))
    }
    return this.sessionSync.currentStatus === 'loggedIn'
  }
}
