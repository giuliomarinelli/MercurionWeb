import { Injectable, effect, inject, signal } from '@angular/core'
import { EMPTY, Subscription, catchError, forkJoin, map } from 'rxjs'
import { AccountService } from '../../services/account.service'
import { ToastService } from '../../services/toast.service'
import type { AuthProvider } from '../../Models/auth/provider.models'
import type { BuildIdentityDTO, ProfileDTO } from '../../Models/account/account.models'
import { DomainInvalidationService } from '../../services/domain-invalidation.service'

@Injectable()
export class SettingsAccountFacade {
  private readonly account = inject(AccountService)
  private readonly toast = inject(ToastService)
  private readonly invalidations = inject(DomainInvalidationService)
  private request?: Subscription

  readonly loading = signal(true)
  readonly profile = signal<ProfileDTO | null>(null)
  readonly version = signal<BuildIdentityDTO | null>(null)
  readonly authProvider = signal<AuthProvider | null>(null)
  readonly isSso = signal(false)
  readonly error = signal(false)

  constructor() {
    effect(() => {
      const event = this.invalidations.last()
      const profileChanged =
        event?.domain === 'profile' &&
        event.action === 'changed' &&
        event.remote === true
      const reconnect = event?.domain === 'realtime' && event.action === 'reconcile'
      if (!profileChanged && !reconnect) return
      queueMicrotask(() => this.load())
    })
  }

  load(): void {
    if (this.request && !this.request.closed) return
    this.loading.set(true)
    this.error.set(false)
    this.request = forkJoin({
      version: this.account.getCurrentVersion(),
      profile: this.account.getProfileRegistry(false),
      provider: this.account.getProvidedAccountId(),
    }).pipe(
      map(({ version, profile, provider }) => {
        this.version.set(version)
        this.profile.set(profile)
        this.authProvider.set(provider.provider)
        this.isSso.set(provider.provider !== 'Mercurion')
        this.loading.set(false)
      }),
      catchError(() => {
        this.error.set(true)
        this.toast.trigger('Si è verificato un errore nel caricamento delle informazioni dell’account.')
        return EMPTY
      }),
    ).subscribe()
  }
}
