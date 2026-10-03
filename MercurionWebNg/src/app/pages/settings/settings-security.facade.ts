import { Injectable, computed, effect, inject, signal } from '@angular/core'
import { Subscription, switchMap } from 'rxjs'
import { AccountService } from '../../services/account.service'
import { AuthUseCasesService } from '../../services/auth-use-cases.service'
import { SessionSyncService } from '../../services/session-sync.service'
import { UserContextService } from '../../services/context/user-context.service'
import { ToastService } from '../../services/toast.service'
import type { MfaStrategy, SessionDTOExt } from '../../Models/account/account.models'
import { DomainInvalidationService } from '../../services/domain-invalidation.service'
import { RealtimeSyncStatusService } from '../../services/realtime-sync-status.service'

@Injectable()
export class SettingsSecurityFacade {
  private readonly account = inject(AccountService)
  private readonly auth = inject(AuthUseCasesService)
  private readonly sessionSync = inject(SessionSyncService)
  private readonly user = inject(UserContextService)
  private readonly toast = inject(ToastService)
  private readonly invalidations = inject(DomainInvalidationService)
  private readonly syncStatus = inject(RealtimeSyncStatusService)
  private loadSubscription?: Subscription
  private logoutSubscription?: Subscription

  readonly loading = signal(true)
  readonly enabledMfa = signal(false)
  readonly strategies = signal<MfaStrategy[]>([])
  readonly sessions = signal<SessionDTOExt[]>([])
  readonly currentSession = computed(() => this.sessions().find(session => session.current))

  constructor() {
    effect(() => {
      const event = this.invalidations.last()
      const securityChanged =
        (event?.domain === 'account-security' || event?.domain === 'sessions') &&
        event.action === 'changed' &&
        event.remote === true
      const reconnect = event?.domain === 'realtime' && event.action === 'reconcile'
      if (!securityChanged && !reconnect) return
      if (securityChanged) this.syncStatus.markSynchronized()
      queueMicrotask(() => this.load(true))
    })
  }

  load(force = false): void {
    if (this.loadSubscription && !this.loadSubscription.closed) {
      if (!force) return
      this.loadSubscription.unsubscribe()
    }
    this.loading.set(true)
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
        this.sessions.update(items => {
          // Realtime invalidation can arrive before the logout HTTP response.
          const pending = new Map(items.filter(item => item.isBeingDeleted).map(item => [item.id, item]))
          const refreshed = sessions.map(session => {
            const deleting = pending.get(session.id)
            pending.delete(session.id)
            return deleting ?? { ...session, triggerDisappear: signal(false), isBeingDeleted: false }
          })
          return [...refreshed, ...pending.values()]
        })
        this.loading.set(false)
      },
      error: () => this.toast.trigger('Si è verificato un errore nel caricamento delle sessioni.', 'error'),
    })
  }

  logoutSession(id: string): void {
    const session = this.sessions().find(item => item.id === id)
    if (!session || session.isBeingDeleted) return
    this.sessions.update(items => items.map(item => item.id === id ? { ...item, isBeingDeleted: true } : item))
    this.logoutSubscription = this.auth.logoutFromSession(id, session.current).subscribe({
      next: () => {
        if (session.current) {
          this.sessionSync.notifyVoluntaryLogout()
          this.user.logout()
        }
        this.sessions.update(items => items.filter(item => item.id !== id))
      },
      error: () => {
        this.sessions.update(items => items.map(item => item.id === id ? { ...item, isBeingDeleted: false } : item))
        this.toast.trigger('La sessione non è stata eliminata.', 'error')
      },
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
