import { Injectable, inject, signal } from '@angular/core'
import { Subscription, switchMap } from 'rxjs'
import { AccountService } from '../../services/account.service'
import { AuthUseCasesService } from '../../services/auth-use-cases.service'
import { SessionSyncService } from '../../services/session-sync.service'
import { UserContextService } from '../../services/context/user-context.service'
import { ToastService } from '../../services/toast.service'
import type { MfaStrategy, SessionDTOExt } from '../../Models/account/account.models'

@Injectable()
export class SettingsSecurityFacade {
  private readonly account = inject(AccountService)
  private readonly auth = inject(AuthUseCasesService)
  private readonly sessionSync = inject(SessionSyncService)
  private readonly user = inject(UserContextService)
  private readonly toast = inject(ToastService)
  private loadSubscription?: Subscription
  private logoutSubscription?: Subscription

  readonly loading = signal(true)
  readonly enabledMfa = signal(false)
  readonly strategies = signal<MfaStrategy[]>([])
  readonly sessions = signal<SessionDTOExt[]>([])

  load(): void {
    if (this.loadSubscription && !this.loadSubscription.closed) return
    this.loadSubscription = this.account.isMfaEnabled().pipe(
      switchMap(enabled => {
        this.enabledMfa.set(enabled)
        return enabled ? this.account.getEnabledMfaStrategies() : [[] as MfaStrategy[]]
      }),
      switchMap(strategies => {
        this.strategies.set(strategies)
        return this.account.getActiveSessions()
      }),
    ).subscribe({
      next: sessions => {
        this.sessions.set(sessions.map(session => ({ ...session, triggerDisappear: signal(false), isBeingDeleted: false })))
        this.loading.set(false)
      },
      error: () => this.toast.trigger('Si è verificato un errore nel caricamento delle sessioni.', 'error'),
    })
  }

  logoutSession(id: string): void {
    const session = this.sessions().find(item => item.id === id)
    if (!session) return
    this.logoutSubscription = this.auth.logoutFromSession(id, session.current).subscribe({
      next: () => {
        if (session.current) {
          this.sessionSync.notifyVoluntaryLogout()
          this.user.logout()
        }
        this.sessions.update(items => items.filter(item => item.id !== id))
      },
      error: () => this.toast.trigger('La sessione non è stata eliminata.', 'error'),
    })
  }

  logoutAll(): void {
    this.logoutSubscription = this.auth.logoutFromAllSessions().subscribe({
      next: () => {
        this.sessionSync.notifyVoluntaryLogout()
        this.user.logout()
        this.sessions.set([])
      },
      error: () => this.toast.trigger('Le sessioni non sono state eliminate.', 'error'),
    })
  }
}
