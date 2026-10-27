import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { combineLatest, EMPTY, of, Subscription, switchMap, take, tap } from 'rxjs'
import { ProgressIndicatorComponent } from '../../components/common/progress-indicator/progress-indicator.component'
import { Helpers } from '../../helpers'
import { AccountService } from '../../services/account.service'
import { UserContextService } from '../../services/context/user-context.service'
import { CopyButtonComponent } from '../../components/common/copy-button/copy-button.component'

@Component({
  selector: 'm-account-activate.page',
  imports: [ProgressIndicatorComponent, RouterLink, CopyButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-page" aria-labelledby="activation-title" [attr.aria-busy]="loading()">
      <div class="auth-container">
        <section class="auth-card">
          <header class="auth-header">
            @if (canView()) {
              <span class="shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                  class="fill-current size-7 md:size-8 lg:size-10 text-light-accent-secondary dark:text-dark-accent-secondary"
                  aria-hidden="true"
                >
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path
                    d="M240 192C240 147.8 275.8 112 320 112C364.2 112 400 147.8 400 192C400 236.2 364.2 272 320 272C275.8 272 240 236.2 240 192zM146.2 576L195.4 416L444.5 416L493.7 576L543.9 576L479.9 368L159.9 368L95.9 576L146.1 576zM320 320C390.7 320 448 262.7 448 192C448 121.3 390.7 64 320 64C249.3 64 192 121.3 192 192C192 262.7 249.3 320 320 320z"
                  />
                </svg>
              </span>
            }
            <div>
              <h1 id="activation-title" class="auth-title">
                {{ canView() ? 'Account attivato' : 'Attivazione account' }}
              </h1>
              <p class="auth-description">Completa l’ingresso nel tuo spazio Mercurion.</p>
            </div>
          </header>
          @if (loading()) {
            <div class="auth-status" role="status">
              <m-progress-indicator [size]="24" />
              <p>Verifica del link in corso…</p>
            </div>
          } @else if (canView()) {
            <div class="auth-stack" role="region" aria-label="Informazioni attivazione account">
              <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                  class="fill-current w-20 h-auto shrink-0 text-emerald-800 dark:text-emerald-400"
                  aria-hidden="true"
                >
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path
                    d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 96C196.3 96 96 196.3 96 320C96 443.7 196.3 544 320 544C443.7 544 544 443.7 544 320C544 196.3 443.7 96 320 96zM438.3 236.5L428.9 249.4L300.9 425.4L289.9 440.6L201.3 352L223.9 329.4L286 391.5L403 230.7L412.4 217.8L438.3 236.6z"
                  />
                </svg>
                <p class="auth-description auth-flow-copy">
                  Il tuo account è stato attivato con successo.
                </p>
              </div>
              <div class="auth-notice">
                Puoi visualizzare questo codice di recupero soltanto ora. Salvalo in un password
                manager oppure stampalo e custodiscilo in un luogo sicuro: servirà se non riuscirai
                più ad accedere.
              </div>
              <div class="auth-recovery-code">
                <code>{{ recoveryCode() }}</code>
                <m-copy-button [src]="recoveryCode()" ariaLabel="Copia il codice di recupero" />
              </div>
              <a routerLink="/login" class="auth-option">Vai all’accesso</a>
            </div>
          } @else {
            <div class="auth-stack">
              <p class="auth-error" role="alert">
                Il link non è valido, è scaduto o non è stato possibile completare l’attivazione.
              </p>
              <p class="auth-description auth-flow-copy">
                Apri il link completo ricevuto via e-mail. L’account deve essere attivato entro 2
                ore dalla registrazione.
              </p>
              <a routerLink="/login" class="auth-option">Torna all’accesso</a>
              <a href="mailto:mercurion.app@gmail.com" class="auth-link">Richiedi assistenza</a>
            </div>
          }
        </section>
      </div>
    </main>
  `,
  styleUrls: ['../login/auth-entry.css', '../login/account-flow.css'],
})
export class AccountActivatePageComponent implements OnInit, OnDestroy {
  // ======================= DEPS =======================
  private readonly destroyRef = inject(DestroyRef)
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly accountService = inject(AccountService)
  private readonly userContext = inject(UserContextService)
  // ====================================================

  private qpSub?: Subscription

  loading = signal<boolean>(false)
  canView = signal<boolean>(false)
  recoveryCode = signal<string>('')

  private showLinkError(): void {
    this.loading.set(false)
    this.canView.set(false)
  }

  ngOnInit(): void {
    this.qpSub = combineLatest([this.route.queryParamMap, this.route.fragment])
      .pipe(
        tap(() => {
          this.loading.set(true)
          this.userContext.logout()
        }),
        take(1),
        switchMap(([_, frag]) => {
          const t = frag ? (new URLSearchParams(frag).get('t') ?? '') : ''

          if (!t || !Helpers.isValidJwt(t)) {
            this.showLinkError()
            return EMPTY
          }

          this.router.navigate([], {
            relativeTo: this.route,
            replaceUrl: true,
            fragment: undefined,
          })

          queueMicrotask(() => {
            if (!this.destroyRef.destroyed && location.hash) {
              history.replaceState({}, '', location.pathname + location.search)
            }
          })

          return of(t)
        }),
        switchMap((t) => this.accountService.activateAccount(t))
      )
      .subscribe({
        next: (res) => {
          if (!res.recoveryCode) {
            this.showLinkError()
            return
          }
          this.canView.set(true)
          this.loading.set(false)
          this.recoveryCode.set(res.recoveryCode)
        },
        error: () => this.showLinkError(),
      })
  }
  ngOnDestroy(): void {
    this.qpSub?.unsubscribe()
  }
}
