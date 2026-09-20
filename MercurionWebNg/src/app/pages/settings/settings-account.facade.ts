import { Injectable, inject, signal } from '@angular/core'
import { EMPTY, Subscription, catchError, forkJoin, map, of, switchMap } from 'rxjs'
import { AccountService } from '../../services/account.service'
import { ToastService } from '../../services/toast.service'
import type { AuthProvider } from '../../Models/auth/provider.models'
import type { BuildIdentityDTO, ProfileDTO } from '../../Models/account/account.models'

@Injectable()
export class SettingsAccountFacade {
  private readonly account = inject(AccountService)
  private readonly toast = inject(ToastService)
  private request?: Subscription

  readonly loading = signal(true)
  readonly profile = signal<ProfileDTO | null>(null)
  readonly version = signal<BuildIdentityDTO | null>(null)
  readonly authProvider = signal<AuthProvider | null>(null)
  readonly isSso = signal(false)
  readonly error = signal(false)

  load(): void {
    if (this.request && !this.request.closed) return
    this.request = forkJoin({
      version: this.account.getCurrentVersion(),
      profile: this.account.getProfileRegistry(false),
      provider: this.account.getProvidedEmail(),
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
