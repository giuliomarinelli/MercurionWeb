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
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component'
import {
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms'
import { finalize, Subscription } from 'rxjs'
import { RecoveryService } from '../../services/recovery.service'
import { CopyButtonComponent } from '../../components/common/copy-button/copy-button.component'
import { emailAvailabilityValidator, matchPassword } from '../../custom-validators'
import { AuthTransportService } from '../../services/auth-transport.service'
import { RouterLink } from '@angular/router'
import { adaptHttpFormError, type FormErrorState } from '../../utils/form-error.adapter'

@Component({
  selector: 'm-account-recovery.page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonPendingContentComponent,
    TextFieldComponent,
    TurnstileComponent,
    ReactiveFormsModule,
    CopyButtonComponent,
    RouterLink,
  ],
  template: `
    <main class="auth-page" aria-labelledby="account-recovery-heading" [attr.aria-busy]="loading()">
      <div class="auth-container">
        <a routerLink="/login" class="auth-link mb-3">
          <span aria-hidden="true">←</span>
          Torna all’accesso
        </a>
        <section class="auth-card">
          <header class="auth-header">
            <span class="shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 640 640"
                class="fill-current text-amber-950 dark:text-dark-warning size-12 shrink-0"
                aria-hidden="true"
              >
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path
                  d="M592 544L48 544L320 48L592 544zM292 420L292 476L348 476L348 420L292 420zM288 224L300.8 384L339.2 384L352 224L288 224z"
                />
              </svg>
            </span>
            <div>
              <h1 id="account-recovery-heading" class="auth-title">Recupera il tuo account</h1>
              <p class="auth-description">Usa il codice ricevuto al momento dell’attivazione.</p>
            </div>
          </header>
          <div class="auth-stack">
            <p class="auth-step" aria-live="polite">
              {{
                step() === 1
                  ? '1 di 3 · Verifica del codice'
                  : step() === 2
                    ? '2 di 3 · Nuove credenziali'
                    : '3 di 3 · Account ripristinato'
              }}
            </p>
            @if (step() === 1) {
              <div class="auth-notice">
                Questo percorso è dedicato a un account inaccessibile: la verifica del codice
                <strong>blocca l’account e invalida tutte le sessioni</strong>. Se hai dimenticato
                solo la password,
                <a routerLink="/forgot-password" class="a">richiedi un link di recupero password</a
                >.
              </div>
              <form class="auth-form" [formGroup]="codeForm" (ngSubmit)="goToSecondStep()">
                <fieldset class="auth-fields" [disabled]="loading()">
                  <m-text-field
                    label="Codice di recupero"
                    type="text"
                    autocomplete="off"
                    [formControl]="codeCtrl"
                    [errors]="{ required: 'Il codice è obbligatorio.' }"
                  />
                </fieldset>
                @if (computeServerErrorMsg(serverErrorStep()); as error) {
                  <p class="auth-error" role="alert">{{ error }}</p>
                }
                <button
                  type="submit"
                  class="auth-submit"
                  [disabled]="loading() || !turnstileToken() || codeCtrl.invalid"
                  [attr.aria-busy]="loading()"
                >
                  <m-button-pending-content [pending]="loading()">
                    Continua
                  </m-button-pending-content>
                </button>
              </form>
            } @else if (step() === 2) {
              <h2 #stateHeading tabindex="-1" class="auth-section-title">
                Imposta le nuove credenziali
              </h2>
              <div class="auth-notice">
                L’account è bloccato e le sessioni sono state invalidate. Scegli un’e-mail a cui hai
                accesso sicuro e una password complessa per ripristinarlo.
              </div>
              <form class="auth-form" [formGroup]="recoveryGroup" (ngSubmit)="goToThirdStep()">
                <fieldset class="auth-fields" [disabled]="loading()">
                  <m-text-field
                    label="Nuova e-mail"
                    type="email"
                    autocomplete="email"
                    formControlName="email"
                    [hint]="
                      recoveryGroup.controls.email.pending
                        ? 'Verifica della disponibilità…'
                        : undefined
                    "
                    [errors]="{
                      required: 'E-mail obbligatoria.',
                      email: 'Formato e-mail non corretto',
                      pattern: 'Formato e-mail non corretto',
                      emailTaken: 'E-mail già registrata.',
                      serverError: 'Impossibile verificare la disponibilità dell’e-mail. Riprova.',
                    }"
                  />
                  <p class="auth-description auth-flow-copy">
                    Almeno 8 caratteri, con una maiuscola, una minuscola, un numero e un carattere
                    speciale.
                  </p>
                  <m-text-field
                    label="Nuova password"
                    type="password"
                    autocomplete="new-password"
                    formControlName="password"
                    [errors]="{
                      required: 'Password obbligatoria.',
                      pattern:
                        'La password deve essere di almeno 8 caratteri: almeno uno minuscolo, uno maiuscolo, un numero e un carattere speciale.',
                    }"
                  />
                  <m-text-field
                    label="Conferma password"
                    type="password"
                    autocomplete="new-password"
                    formControlName="confirmPassword"
                    [errors]="{
                      required: 'Il campo di conferma password è obbligatorio.',
                      matchPassword: 'Le due password non corrispondono.',
                    }"
                  />
                </fieldset>
                @if (computeServerErrorMsg(serverErrorStep()); as error) {
                  <p class="auth-error" role="alert">{{ error }}</p>
                }
                <button
                  type="submit"
                  class="auth-submit"
                  [disabled]="loading() || !turnstileToken() || !recoveryGroup.valid"
                  [attr.aria-busy]="loading()"
                  aria-label="Continua"
                >
                  <m-button-pending-content [pending]="loading()">
                    Ripristina account
                  </m-button-pending-content>
                </button>
              </form>
            } @else {
              <div class="flex flex-col items-start gap-4 sm:flex-row">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 640"
                  class="fill-current text-light-accent-secondary dark:text-dark-accent-secondary size-12 shrink-0"
                  aria-hidden="true"
                >
                  <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                  <path
                    d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 96C196.3 96 96 196.3 96 320C96 443.7 196.3 544 320 544C443.7 544 544 443.7 544 320C544 196.3 443.7 96 320 96zM438.3 236.5L428.9 249.4L300.9 425.4L289.9 440.6L201.3 352L223.9 329.4L286 391.5L403 230.7L412.4 217.8L438.3 236.6z"
                  />
                </svg>
                <div class="grid min-w-0 gap-2">
                  <h2 #stateHeading tabindex="-1" class="auth-section-title">
                    Account ripristinato
                  </h2>
                  <p class="auth-description auth-flow-copy">
                    Questo è il nuovo codice per recuperare l’account. Puoi visualizzarlo soltanto
                    ora: salvalo in un password manager oppure stampalo e custodiscilo in un luogo
                    sicuro.
                  </p>
                </div>
              </div>
              <div class="auth-recovery-code">
                <code>{{ recoveryCode() }}</code>
                <m-copy-button [src]="recoveryCode()" ariaLabel="Copia il codice di recupero" />
              </div>
              <a routerLink="/login" class="auth-option">Vai all’accesso</a>
            }
            @if (step() !== 3) {
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
            }
            <div class="auth-support">
              <a href="mailto:mercurion.app@gmail.com" class="auth-option">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 640 512"
                  class="h-5 w-auto fill-current"
                  aria-hidden="true"
                >
                  <path
                    d="M544 248l0 3.3 69.7-69.7c21.9-21.9 21.9-57.3 0-79.2L535.6 24.4c-21.9-21.9-57.3-21.9-79.2 0L416.3 64.5c-2.7-.3-5.5-.5-8.3-.5L296 64c-37.1 0-67.6 28-71.6 64l-.4 0 0 120c0 22.1 17.9 40 40 40s40-17.9 40-40l0-72c0 0 0-.1 0-.1l0-15.9 16 0 136 0c0 0 0 0 .1 0l7.9 0c44.2 0 80 35.8 80 80l0 8zM336 192l0 56c0 39.8-32.2 72-72 72s-72-32.2-72-72l0-118.6c-35.9 6.2-65.8 32.3-76 68.2L99.5 255.2 26.3 328.4c-21.9 21.9-21.9 57.3 0 79.2l78.1 78.1c21.9 21.9 57.3 21.9 79.2 0l37.7-37.7c.9 0 1.8 .1 2.7 .1l160 0c26.5 0 48-21.5 48-48c0-5.6-1-11-2.7-16l2.7 0c26.5 0 48-21.5 48-48c0-12.8-5-24.4-13.2-33c25.7-5 45.1-27.6 45.2-54.8l0-.4c-.1-30.8-25.1-55.8-56-55.8c0 0 0 0 0 0l-120 0z"
                  />
                </svg>
                <span>Richiedi assistenza</span>
              </a>
              @if (step() !== 3) {
                <a routerLink="/login" class="auth-option mt-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    class="h-5 w-auto fill-current"
                    aria-hidden="true"
                  >
                    <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                    <path
                      d="M320 96C355.3 96 384 124.7 384 160L384 224L256 224L256 160C256 124.7 284.7 96 320 96zM192 160L192 224L128 224L128 576L512 576L512 224L448 224L448 160C448 89.3 390.7 32 320 32C249.3 32 192 89.3 192 160zM344 360L344 464L296 464L296 336L344 336L344 360z"
                    />
                  </svg>
                  <span>Vai al Login</span>
                </a>
              }
            </div>
          </div>
        </section>
      </div>
    </main>
  `,
  styleUrls: ['../login/auth-entry.css', '../login/account-flow.css'],
})
export class AccountRecoveryPageComponent implements OnInit, OnDestroy {
  private readonly turnstileComponent = viewChild(TurnstileComponent)

  private readonly recoveryService = inject(RecoveryService)
  private readonly authService = inject(AuthTransportService)
  private readonly fb = inject(NonNullableFormBuilder)
  private readonly destroyRef = inject(DestroyRef)
  private readonly injector = inject(Injector)
  private readonly stateHeading = viewChild<ElementRef<HTMLElement>>('stateHeading')

  private focusState(): void {
    afterNextRender(() => this.stateHeading()?.nativeElement.focus({ preventScroll: true }), {
      injector: this.injector,
    })
  }

  private firstStepSub?: Subscription
  private secondStepSub?: Subscription
  private codeCtrlSub?: Subscription
  private recoveryGroupSub?: Subscription
  private passwordValueChangesSub?: Subscription

  codeCtrl: FormControl<string> = new FormControl('', { nonNullable: true })
  codeForm = new FormGroup({ code: this.codeCtrl })
  recoveryGroup: FormGroup<{
    email: FormControl<string>
    password: FormControl<string>
    confirmPassword: FormControl<string>
  }> = new FormGroup({
    email: new FormControl('', { nonNullable: true }),
    password: new FormControl('', { nonNullable: true }),
    confirmPassword: new FormControl('', { nonNullable: true }),
  })

  serverErrorStep = signal<{ step: 0 | 1 | 2 | 3; error: FormErrorState }>({
    step: 0,
    error: { fieldErrors: {}, globalError: null },
  })

  turnstileToken = signal<string>('')
  loadingTurnstile = signal<boolean>(true)
  loading = signal<boolean>(false)
  step = signal<1 | 2 | 3>(1)
  recoveryToken = signal<string>('')
  recoveryCode = signal<string>('')

  ngOnInit(): void {
    this.codeCtrl = this.fb.control('', [Validators.required])
    this.codeForm.setControl('code', this.codeCtrl)
    this.recoveryGroup = this.fb.group({
      email: this.fb.control(
        '',
        [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)],
        emailAvailabilityValidator(this.authService)
      ),
      password: this.fb.control('', [
        Validators.required,
        Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/),
      ]),
      confirmPassword: this.fb.control('', [Validators.required, matchPassword]),
    })
    this.codeCtrlSub = this.codeCtrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.resetServerError()
      })
    this.recoveryGroupSub = this.recoveryGroup.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.resetServerError()
      })
    const passwordCtrl = this.recoveryGroup.get('password')
    const confirmPasswordCtrl = this.recoveryGroup.get('confirmPassword')
    if (passwordCtrl && confirmPasswordCtrl) {
      this.passwordValueChangesSub = passwordCtrl.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => {
          confirmPasswordCtrl.updateValueAndValidity({ onlySelf: true })
        })
    }
  }

  ngOnDestroy(): void {
    this.firstStepSub?.unsubscribe()
    this.secondStepSub?.unsubscribe()
    this.codeCtrlSub?.unsubscribe()
    this.recoveryGroupSub?.unsubscribe()
    this.passwordValueChangesSub?.unsubscribe()
  }

  goToSecondStep(): void {
    if (this.loading()) {
      return
    }
    this.codeCtrl.markAsTouched()
    if (this.codeCtrl.valid && this.turnstileToken()) {
      this.loading.set(true)
      this.firstStepSub = this.recoveryService
        .accountRecovery_firstStep(this.codeCtrl.value, this.turnstileToken())
        .pipe(
          finalize(() => {
            this.turnstileToken.set('')
            this.loading.set(false)
            queueMicrotask(() => this.resetTurnstileWidget())
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (res) => {
            if (!res.recoveryToken) {
              this.serverErrorStep.set({
                step: 1,
                error: {
                  fieldErrors: {},
                  globalError: 'Non è stato possibile verificare il codice. Riprova.',
                },
              })
              return
            }
            this.recoveryToken.set(res.recoveryToken)
            this.resetServerError()
            this.step.set(2)
            this.focusState()
          },
          error: (e) =>
            this.serverErrorStep.set({
              step: 1,
              error: adaptHttpFormError(e, { ACCOUNT_RECOVERY_CODE_INVALID: { code: 'code' } }),
            }),
        })
    }
  }

  goToThirdStep(): void {
    if (this.loading()) {
      return
    }
    this.recoveryGroup.markAllAsTouched()
    if (this.recoveryGroup.valid && this.turnstileToken()) {
      this.loading.set(true)
      this.secondStepSub = this.recoveryService
        .accountRecovery_secondStep(
          this.recoveryGroup.controls['email'].value,
          this.recoveryGroup.controls['password'].value,
          this.recoveryToken(),
          this.turnstileToken()
        )
        .pipe(
          finalize(() => {
            this.turnstileToken.set('')
            this.loading.set(false)
            queueMicrotask(() => this.resetTurnstileWidget())
          }),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe({
          next: (res) => {
            if (!res.recoveryCode) {
              this.serverErrorStep.set({
                step: 2,
                error: {
                  fieldErrors: {},
                  globalError:
                    'Non è stato possibile confermare il ripristino. Richiedi assistenza.',
                },
              })
              return
            }
            this.recoveryCode.set(res.recoveryCode)
            this.resetServerError()
            this.step.set(3)
            this.focusState()
          },
          error: (e) =>
            this.serverErrorStep.set({
              step: 2,
              error: adaptHttpFormError(e, {
                PASSWORD_CHANGE_CREDENTIALS_INVALID: { email: 'email' },
              }),
            }),
        })
    }
  }

  onTurnstileToken(token: string): void {
    this.turnstileToken.set(token)
  }

  onTurnstileRefresh(): void {
    this.turnstileToken.set('')
    this.loadingTurnstile.set(true)
  }

  onTurnstileRender(): void {
    this.loadingTurnstile.set(false)
  }

  computeServerErrorMsg(input: { step: 0 | 1 | 2 | 3; error: FormErrorState }): string | null {
    return input.step === 0 ? null : input.error.globalError
  }

  private resetTurnstileWidget(): void {
    if (this.destroyRef.destroyed) {
      return
    }
    const turnstileComponent = this.turnstileComponent()
    if (!turnstileComponent) {
      this.loadingTurnstile.set(false)
      return
    }
    this.loadingTurnstile.set(true)
    turnstileComponent.reset()
  }

  private resetServerError(): void {
    this.serverErrorStep.set({
      step: 0,
      error: { fieldErrors: {}, globalError: null },
    })
  }
}
