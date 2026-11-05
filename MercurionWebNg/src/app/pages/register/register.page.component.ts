import { ButtonPendingContentComponent } from '../../components/common/button/button-pending-content.component'
import {
  afterNextRender,
  ElementRef,
  Injector,
  Component,
  ChangeDetectionStrategy,
  computed,
  DestroyRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { PublicPipe } from '../../pipes/public.pipe'
import {
  ReactiveFormsModule,
  Validators,
  FormGroup,
  FormControl,
  NonNullableFormBuilder,
} from '@angular/forms'
import { ThemeManagerService } from '../../services/context/theme-manager.service'
import { AuthTransportService } from '../../services/auth-transport.service'
import { UserContextService } from '../../services/context/user-context.service'
import { environment } from '../../../environments/environment'
import { Subscription } from 'rxjs'
import { TextFieldComponent } from '../../components/common/text-field/text-field.component'
import { PmSelectComponent } from '../../components/common/pm-select/pm-select.component'
import { emailAvailabilityValidator, matchPassword } from '../../custom-validators'
import {
  UserGenderControl,
  UserRegisterDTO,
  UserRegistrationFormControls,
  UserRegistrationFormValue,
} from '../../Models/auth/user.models'
import { Helpers } from '../../helpers'
import { ToastService } from '../../services/toast.service'
import { ScrollContextService } from '../../services/context/scroll-context.service'
import { PmOption } from '../../Models/pm-option.model'
import { RouterLink } from '@angular/router'
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component'
import { adaptHttpFormError, type FormErrorState } from '../../utils/form-error.adapter'
import { ApplicationErrorCode, getApplicationErrorCode } from '../../utils/application-error.util'

@Component({
  selector: 'm-register.page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonPendingContentComponent,
    PublicPipe,
    ReactiveFormsModule,
    TextFieldComponent,
    PmSelectComponent,

    RouterLink,
    TurnstileComponent,
  ],
  template: `
    @if (userContext.isLoggedOut()) {
      <main class="auth-page" aria-labelledby="register-heading" [attr.aria-busy]="loading()">
        <div class="auth-container auth-flow-wide">
          <a routerLink="/login" class="auth-link mb-3">
            <span aria-hidden="true">←</span>
            Torna all’accesso
          </a>
          <section class="auth-card auth-flow-wide">
            <header class="auth-header">
              <img [src]="logoSrc() | public" alt="" width="48" height="64" />
              <div>
                <h1 id="register-heading" class="auth-title">Crea il tuo account Mercurion</h1>
                <p class="auth-description">
                  Il tuo spazio per esplorare e organizzare le molecole.
                </p>
              </div>
            </header>
            @if (step() === 1) {
              <form
                class="auth-form"
                [formGroup]="form"
                (ngSubmit)="onSubmit()"
                aria-labelledby="register-heading"
              >
                <fieldset class="auth-fields" [disabled]="loading()">
                  <legend class="auth-section-title">Il tuo profilo</legend>
                  <div class="auth-field-grid">
                    <m-text-field
                      label="Nome"
                      type="text"
                      autocomplete="given-name"
                      formControlName="firstName"
                      [errors]="{
                        required: 'Il nome è obbligatorio.',
                        pattern: 'Il formato del nome non è valido.',
                      }"
                    />
                    <m-text-field
                      label="Cognome"
                      type="text"
                      autocomplete="family-name"
                      formControlName="lastName"
                      [errors]="{
                        required: 'Il cognome è obbligatorio.',
                        pattern: 'Il formato del cognome non è valido.',
                      }"
                    />
                    <m-text-field
                      label="E-mail"
                      type="email"
                      autocomplete="email"
                      formControlName="email"
                      [hint]="
                        form.controls.email.pending ? 'Verifica della disponibilità…' : undefined
                      "
                      [errors]="{
                        required: emailRequired,
                        pattern: emailMalformed,
                        email: emailMalformed,
                        emailTaken: 'E-mail già registrata.',
                        serverError:
                          'Impossibile verificare la disponibilità dell’e-mail. Riprova.',
                      }"
                    />
                    <m-text-field
                      label="Il tuo lavoro"
                      type="text"
                      autocomplete="organization-title"
                      formControlName="job"
                      hint="Facoltativo"
                      [errors]="{ pattern: 'Il formato del lavoro non è valido.' }"
                    />
                  </div>
                  <div>
                    <m-select
                      id="register-gender"
                      label="Genere *"
                      placeholder="Seleziona il genere"
                      layout="fullWidth"
                      [options]="options"
                      formControlName="gender"
                      tone="highContrast"
                      aria-describedby="register-gender-error"
                    />
                    <p
                      id="register-gender-error"
                      class="auth-field-message"
                      [attr.role]="
                        form.controls.gender.touched && form.controls.gender.invalid
                          ? 'alert'
                          : null
                      "
                    >
                      @if (form.controls.gender.touched && form.controls.gender.invalid) {
                        Genere obbligatorio.
                      }
                    </p>
                  </div>
                </fieldset>
                <fieldset class="auth-fields" [disabled]="loading()">
                  <legend class="auth-section-title">Proteggi il tuo account</legend>
                  <p class="auth-description auth-flow-copy" id="register-password-hint">
                    Almeno 8 caratteri, con una maiuscola, una minuscola, un numero e un carattere
                    speciale.
                  </p>
                  <div class="auth-field-grid">
                    <m-text-field
                      label="Password"
                      type="password"
                      autocomplete="new-password"
                      formControlName="password"
                      describedById="register-password-hint"
                      [errors]="{
                        required: 'La password è obbligatoria.',
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
                  </div>
                  <div class="auth-consent flex min-w-0 items-start gap-3">
                    <label
                      for="onlyKnown"
                      class="relative mt-0.5 block size-4 shrink-0 cursor-pointer"
                    >
                      <input
                        id="onlyKnown"
                        type="checkbox"
                        name="onlyKnown"
                        class="peer absolute inset-0 z-20 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
                        [formControl]="acceptCtrl"
                        aria-label="Accetto privacy e termini"
                        aria-describedby="accept-terms-description"
                      />
                      <span
                        class="pointer-events-none absolute inset-0 rounded-sm border border-gray-300 bg-white peer-checked:bg-blue-600/80 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--m-color-focus)] peer-disabled:opacity-55 dark:border-white/10 dark:bg-white/5 dark:peer-checked:border-dark-accent-primary-btn dark:peer-checked:bg-dark-accent-primary-btn"
                        aria-hidden="true"
                      ></span>
                      <svg
                        viewBox="0 0 14 14"
                        fill="none"
                        class="pointer-events-none absolute left-px top-px hidden size-3.5 peer-checked:block peer-disabled:opacity-55"
                        aria-hidden="true"
                      >
                        <path
                          d="M3 8L6 11L11 3.5"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          class="stroke-white"
                        />
                      </svg>
                    </label>
                    <div
                      id="accept-terms-description"
                      class="min-w-0 flex-1 text-base font-medium tracking-wider break-words text-gray-900 dark:text-white"
                    >
                      <label for="onlyKnown" class="cursor-pointer"
                        >Dichiaro di aver letto e di accettare l’</label
                      ><a class="a" routerLink="/privacy" target="_blank" rel="noopener noreferrer"
                        >Informativa sulla Privacy</a
                      >, i
                      <a
                        class="a"
                        routerLink="/terms-and-policies"
                        target="_blank"
                        rel="noopener noreferrer"
                        >Termini di Servizio</a
                      >
                      e la
                      <a
                        class="a"
                        routerLink="/terms-and-policies"
                        fragment="aup"
                        target="_blank"
                        rel="noopener noreferrer"
                        >Politica di Utilizzo Accettabile</a
                      >.
                    </div>
                  </div>
                </fieldset>
                @if (
                  !form.controls.email.hasError('emailTaken') && serverError().globalError;
                  as error
                ) {
                  <p class="auth-error" role="alert">{{ error }}</p>
                }
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
                      [class.invisible]="loadingTurnstile()"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  class="auth-submit"
                  [disabled]="
                    loading() ||
                    settedDisabledBtn() ||
                    !acceptCtrl.value ||
                    !turnstileToken() ||
                    !form.valid
                  "
                  [attr.aria-busy]="loading()"
                  aria-label="Completa la registrazione"
                >
                  <m-button-pending-content [pending]="loading()">
                    Registrati
                  </m-button-pending-content>
                </button>
                <p class="auth-description auth-flow-copy">
                  Hai già un account?
                  <a class="auth-link" routerLink="/login">Accedi</a>
                </p>
              </form>
            } @else {
              <div class="auth-stack" role="status">
                <div class="flex flex-col items-start gap-4 sm:flex-row">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 640 640"
                    class="h-auto w-20 shrink-0 fill-current text-emerald-800 dark:text-emerald-400"
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
                      La registrazione è riuscita. Abbiamo inviato un link di attivazione a
                      <strong>{{ obscuredEmail() }}</strong
                      >.
                    </p>
                  </div>
                </div>
                <div class="auth-notice">
                  Attiva l’account entro
                  <strong>2 ore</strong>
                  per poter accedere. Dopo questo termine l’account non attivato verrà cancellato
                  automaticamente.
                </div>
                <a routerLink="/login" class="auth-option">Torna all’accesso</a>
              </div>
            }
          </section>
        </div>
      </main>
    }
  `,
  styleUrls: ['../login/auth-entry.css', '../login/account-flow.css'],
})
export class RegisterPageComponent implements OnInit, OnDestroy {
  // ======================= DEPS =======================
  private readonly fb = inject(NonNullableFormBuilder)
  private readonly themeManager = inject(ThemeManagerService)
  private readonly authService = inject(AuthTransportService)
  protected readonly userContext = inject(UserContextService)
  private readonly toast = inject(ToastService)
  private readonly scrollContext = inject(ScrollContextService)
  private readonly destroyRef = inject(DestroyRef)
  private readonly injector = inject(Injector)
  private readonly stateHeading = viewChild<ElementRef<HTMLElement>>('stateHeading')

  private focusState(): void {
    afterNextRender(() => this.stateHeading()?.nativeElement.focus({ preventScroll: true }), {
      injector: this.injector,
    })
  }

  // ====================================================

  readonly turnstileComponent = viewChild(TurnstileComponent)

  private regSub?: Subscription
  private valChSub?: Subscription
  private fSub?: Subscription

  emailRequired = "L'e-mail è obbligatoria."
  emailMalformed = "Il formato dell'e-mail non è corretto."

  step = signal<1 | 2>(1)
  loading = signal<boolean>(false)
  obscuredEmail = signal<string>('')
  serverError = signal<FormErrorState<'email'>>({ fieldErrors: {}, globalError: null })
  settedDisabledBtn = signal<boolean>(false)
  logoSrc = computed(() => {
    const { PICTOGRAM_LIGHT, PICTOGRAM_DARK } = environment.logoSrc
    return this.themeManager.theme() === 'light' ? PICTOGRAM_LIGHT : PICTOGRAM_DARK
  })
  loadingTurnstile = signal<boolean>(true)
  turnstileToken = signal<string>('')

  acceptCtrl = new FormControl(false, { nonNullable: true })

  form: FormGroup<UserRegistrationFormControls> = this.fb.group(
    {
      firstName: this.fb.control('', {
        validators: [Validators.required, Validators.pattern(/^[A-ZÀ-Ýa-zà-ÿ\s]+$/)],
      }),
      lastName: this.fb.control('', {
        validators: [Validators.required, Validators.pattern(/^[A-ZÀ-Ýa-zà-ÿ\s]+$/)],
      }),
      email: this.fb.control('', {
        validators: [
          Validators.required,
          Validators.email,
          Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
        ],
        asyncValidators: [emailAvailabilityValidator(this.authService)],
      }),
      job: new FormControl<string | null>(null, {
        nonNullable: false,
        validators: [Validators.pattern(/^(?:[A-Za-zÀ-Ýà-ÿ]+(?:\s+[A-Za-zÀ-Ýà-ÿ]+)*)?$/)],
      }),
      gender: this.fb.control<UserGenderControl>('', { validators: [Validators.required] }),
      password: this.fb.control('', {
        validators: [
          Validators.required,
          Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/),
        ],
      }),
      confirmPassword: this.fb.control('', { validators: [Validators.required, matchPassword] }),
    },
    { validators: matchPassword }
  )

  options: PmOption[] = [
    {
      label: 'Seleziona il genere',
      value: '',
    },
    {
      label: 'Maschile',
      value: 'M',
    },
    {
      label: 'Femminile',
      value: 'F',
    },
    {
      label: 'Non specificato',
      value: 'Undefined',
    },
  ]

  private markAll(): void {
    Object.values(this.form.controls).forEach((control) => {
      if (control.invalid) {
        control.markAsTouched()
        control.updateValueAndValidity({ onlySelf: true })
      }
    })
  }

  onSubmit(): void {
    if (this.loading()) {
      return
    }
    if (this.form.valid && !this.acceptCtrl.value) {
      return
    }
    if (this.form.valid) {
      if (!this.turnstileToken()) {
        this.turnstileToken.set('')
        this.loadingTurnstile.set(true)
        this.turnstileComponent()?.reset()
        this.loading.set(false)
        return
      }
      this.loading.set(true)
      const { confirmPassword: _omit, ...dto } = this.form.value as UserRegistrationFormValue
      dto.firstName = Helpers.normalizeTitleCase(dto.firstName)
      dto.lastName = Helpers.normalizeTitleCase(dto.lastName)
      if (dto.gender === '') {
        this.loading.set(false)
        return
      }
      const request: UserRegisterDTO = { ...dto, gender: dto.gender }
      this.regSub = this.authService
        .registerUser(request, this.turnstileToken())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (res) => {
            const { obscuredEmail } = res
            if (!obscuredEmail) {
              this.loading.set(false)
              this.serverError.set({
                fieldErrors: {},
                globalError: 'Non è stato possibile confermare la registrazione. Riprova.',
              })
              this.onTurnstileRefresh()
              this.turnstileComponent()?.reset()
              return
            }
            this.obscuredEmail.set(obscuredEmail)
            queueMicrotask(() => {
              if (this.destroyRef.destroyed) {
                return
              }
              this.loading.set(false)
              this.step.set(2)
              this.focusState()
              this.scrollContext.smoothToTop(undefined, 240)
            })
          },
          error: (error) => {
            const formError = adaptHttpFormError(error, {
              USER_REGISTRATION_EMAIL_CONFLICT: { email: 'email' },
            })
            this.serverError.set(formError)
            if (
              getApplicationErrorCode(error) ===
                ApplicationErrorCode.USER_REGISTRATION_EMAIL_CONFLICT ||
              formError.fieldErrors.email
            ) {
              this.form.controls.email.setErrors({
                ...this.form.controls.email.errors,
                emailTaken: true,
              })
              this.form.controls.email.markAsTouched()
            }
            this.turnstileToken.set('')
            this.loadingTurnstile.set(true)
            this.turnstileComponent()?.reset()
            this.loading.set(false)
          },
        })
    } else {
      this.turnstileToken.set('')
      this.loadingTurnstile.set(true)
      this.turnstileComponent()?.reset()
      this.settedDisabledBtn.set(true)
      this.toast.trigger('Errore: controlla i campi con le scritte in rosso!')
      this.markAll()
    }
  }

  onTurnstileToken(token: string): void {
    this.turnstileToken.set(token)
    if (token) {
      this.loadingTurnstile.set(false)
    }
  }

  onTurnstileRefresh(): void {
    this.turnstileToken.set('')
    this.loadingTurnstile.set(true)
  }

  onTurnstileRender(): void {
    this.loadingTurnstile.set(false)
  }

  ngOnInit(): void {
    this.valChSub = this.form
      .get('password')
      ?.valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.form.get('confirmPassword')?.updateValueAndValidity({ onlySelf: true })
      })
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.serverError.set({ fieldErrors: {}, globalError: null })
      if (this.settedDisabledBtn()) {
        this.settedDisabledBtn.set(false)
      }
    })
  }

  ngOnDestroy(): void {
    this.regSub?.unsubscribe()
    this.valChSub?.unsubscribe()
    this.fSub?.unsubscribe()
  }
}
