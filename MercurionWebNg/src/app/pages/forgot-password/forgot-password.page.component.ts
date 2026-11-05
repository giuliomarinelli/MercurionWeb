import { ButtonPendingContentComponent } from '../../components/common/button/button-pending-content.component'
import {
  afterNextRender,
  ElementRef,
  Injector,
  Component,
  ChangeDetectionStrategy,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { TextFieldComponent } from '../../components/common/text-field/text-field.component'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { AccountService } from '../../services/account.service'
import { finalize, Subscription } from 'rxjs'
import { RouterLink } from '@angular/router'
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component'
import { adaptHttpFormError } from '../../utils/form-error.adapter'

@Component({
  selector: 'm-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonPendingContentComponent,
    TextFieldComponent,
    ReactiveFormsModule,
    TurnstileComponent,
    RouterLink,
  ],
  template: `
    <main
      class="auth-page"
      aria-labelledby="forgot-password-title"
      [attr.aria-busy]="step_12_loading()"
    >
      <div class="auth-container">
        <a routerLink="/login" class="auth-link mb-3">
          <span aria-hidden="true">←</span>
          Torna all’accesso
        </a>
        <section class="auth-card">
          <header class="auth-header">
            <div>
              <h1 id="forgot-password-title" class="auth-title">Password dimenticata?</h1>
              <p class="auth-description">Ricevi un link per scegliere una nuova password.</p>
            </div>
          </header>
          @if (step() === 1) {
            <form
              class="auth-form"
              [formGroup]="requestForm"
              (ngSubmit)="send()"
              aria-labelledby="forgot-password-title"
            >
              <div class="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                  class="fill-current size-16 shrink-0"
                  aria-hidden="true"
                >
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path
                    d="M320 96C443.7 96 544 196.3 544 320C544 443.7 443.7 544 320 544C196.3 544 96 443.7 96 320C96 196.3 196.3 96 320 96zM320 576C461.4 576 576 461.4 576 320C576 178.6 461.4 64 320 64C178.6 64 64 178.6 64 320C64 461.4 178.6 576 320 576zM272 416L256 416L256 448L384 448L384 416L336 416L336 288L256 288L256 320L304 320L304 416L272 416zM344 248L344 200L296 200L296 248L344 248z"
                  />
                </svg>
                <p class="auth-description auth-flow-copy">
                  Inserisci l’e-mail del tuo account. Il link che riceverai sarà valido una sola
                  volta e per pochi minuti.
                </p>
              </div>
              <fieldset class="auth-fields" [disabled]="step_12_loading()">
                <m-text-field
                  label="Indirizzo e-mail"
                  type="email"
                  autocomplete="email"
                  [formControl]="email"
                  [errors]="{
                    required: 'E-mail obbligatoria.',
                    email: 'Formato e-mail non corretto',
                  }"
                />
              </fieldset>
              @if (serverError()) {
                <p class="auth-error" role="alert">{{ errMsg() }}</p>
              }
              <button
                type="submit"
                class="auth-submit"
                [disabled]="email.invalid || !turnstileToken() || step_12_loading()"
                [attr.aria-busy]="step_12_loading()"
                aria-label="Recupera password"
              >
                <m-button-pending-content [pending]="step_12_loading()">
                  Invia il link di recupero
                </m-button-pending-content>
              </button>
              <div class="auth-security">
                <div class="auth-security-slot">
                  @if (loadingTurnstile()) {
                    <div class="auth-security-placeholder skeleton-pulse" role="status">
                      <span class="sr-only">Caricamento verifica di sicurezza…</span>
                    </div>
                  }
                  <m-turnstile
                    (token)="onTurnstileToken($event)"
                    (widgetReady)="onTurnstileRender()"
                    (refresh)="onTurnstileRefresh()"
                  />
                </div>
              </div>
              <div class="auth-support">
                <p class="auth-description auth-flow-copy">
                  Non riesci più ad accedere al tuo account?
                </p>
                <a routerLink="/account-recovery" class="auth-link">
                  Usa il codice di recupero account
                  <span aria-hidden="true">→</span>
                </a>
              </div>
            </form>
          } @else {
            <div class="auth-stack" role="status">
              <div class="flex flex-col items-start gap-4 sm:flex-row">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                  class="fill-current size-16 shrink-0 text-emerald-800 dark:text-emerald-400"
                  aria-hidden="true"
                >
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path
                    d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 96C196.3 96 96 196.3 96 320C96 443.7 196.3 544 320 544C443.7 544 544 443.7 544 320C544 196.3 443.7 96 320 96zM438.3 236.5L428.9 249.4L300.9 425.4L289.9 440.6L201.3 352L223.9 329.4L286 391.5L403 230.7L412.4 217.8L438.3 236.6z"
                  />
                </svg>
                <div class="grid min-w-0 gap-2">
                  <h2 #stateHeading tabindex="-1" class="auth-section-title">
                    Controlla la tua e-mail
                  </h2>
                  <p class="auth-description auth-flow-copy">
                    Abbiamo inviato un link per creare una nuova password a
                    <strong>{{ obscuredEmail() }}</strong
                    >.
                  </p>
                </div>
              </div>
              <div class="auth-notice">
                Il link è valido una sola volta e per pochi minuti. Controlla anche la cartella
                della posta indesiderata.
              </div>
              <a routerLink="/login" class="auth-option">Torna all’accesso</a>
            </div>
          }
        </section>
      </div>
    </main>
  `,
  styleUrls: ['../login/auth-entry.css', '../login/account-flow.css'],
})
export class ForgotPasswordPageComponent implements OnInit, OnDestroy {
  private readonly accountService = inject(AccountService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly injector = inject(Injector)
  private readonly stateHeading = viewChild<ElementRef<HTMLElement>>('stateHeading')

  private focusState(): void {
    afterNextRender(() => this.stateHeading()?.nativeElement.focus({ preventScroll: true }), {
      injector: this.injector,
    })
  }

  private readonly turnstileComponent = viewChild(TurnstileComponent)

  protected loadingTurnstile = signal<boolean>(true)
  protected resetTurnstile = signal<boolean>(false)
  protected turnstileToken = signal<string | null>(null)
  protected step = signal<1 | 2>(1)
  protected serverError = signal<boolean>(false)
  protected step_12_loading = signal<boolean>(false)
  protected obscuredEmail = signal<string>('')
  protected errMsg = signal<string>('Si è verificato un errore.')

  protected email = new FormControl<string | null>(null, [Validators.required, Validators.email])

  readonly requestForm = new FormGroup({ email: this.email })

  private recoverSub?: Subscription
  private servErrSub?: Subscription
  private obsMailSub?: Subscription
  private emailCtrlSub?: Subscription

  send(): void {
    if (this.step_12_loading()) {
      return
    }
    this.email.markAsTouched()
    const email = this.email.value
    const turnstileToken = this.turnstileToken()
    if (this.email.valid && email && turnstileToken) {
      this.step_12_loading.set(true)
      this.recoverSub = this.accountService
        .sendForgottenPasswordLink({ email }, turnstileToken)
        .pipe(
          finalize(() => {
            this.step_12_loading.set(false)
            this.turnstileToken.set(null)
            if (!this.destroyRef.destroyed && this.step() === 1) {
              this.loadingTurnstile.set(true)
              this.turnstileComponent()?.reset()
            }
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: ({ obscuredEmail }) => {
            if (!obscuredEmail) {
              this.errMsg.set('Non è stato possibile confermare l’invio. Riprova.')
              this.serverError.set(true)
              this.step_12_loading.set(false)
              return
            }
            this.step.set(2)
            this.focusState()
            this.step_12_loading.set(false)
            this.obscuredEmail.set(obscuredEmail)
          },
          error: (e) => {
            this.errMsg.set(adaptHttpFormError(e).globalError ?? 'Si è verificato un errore.')
            this.serverError.set(true)
            this.step_12_loading.set(false)
          },
        })
    }
  }

  onTurnstileToken(token: string): void {
    this.serverError.set(false)
    this.turnstileToken.set(token)
  }

  onTurnstileRefresh(): void {
    this.turnstileToken.set(null)
    this.loadingTurnstile.set(true)
  }

  onTurnstileRender(): void {
    this.loadingTurnstile.set(false)
  }

  ngOnInit(): void {
    this.emailCtrlSub = this.email.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.serverError.set(false)
        this.errMsg.set('Si è verificato un errore.')
      })
  }

  ngOnDestroy(): void {
    this.recoverSub?.unsubscribe()
    this.servErrSub?.unsubscribe()
    this.obsMailSub?.unsubscribe()
    this.emailCtrlSub?.unsubscribe()
  }
}
