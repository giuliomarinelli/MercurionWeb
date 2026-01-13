import { Component, computed, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { PublicPipe } from '../../pipes/public.pipe';
import { ReactiveFormsModule, Validators, FormGroup, FormControl, NonNullableFormBuilder } from '@angular/forms';
import { ThemeManagerService } from '../../services/context/theme-manager.service';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/context/user-context.service';
import { environment } from '../../../environments/environment.development';
import { Subscription } from 'rxjs';
import { FloatingInputComponent } from '../../components/common/floating-input/floating-input.component';
import { PmSelectComponent } from '../../components/common/pm-select/pm-select.component';
import { emailAvailabilityValidator, matchPassword } from '../../custom-validators';
import { UserGenderControl, UserRegistrationFormControls, UserRegistrationFormValue } from '../../Models/auth/user.models';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { Helpers } from '../../helpers';
import { ToastService } from '../../services/toast.service';
import { AppContextService } from '../../services/context/app-context.service';
import { PmOption } from '../../Models/pm-option.model';
import { RouterLink } from '@angular/router';
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component';


@Component({
  selector: 'm-register.page',
  imports: [
    PublicPipe,
    ReactiveFormsModule,
    FloatingInputComponent,
    PmSelectComponent,
    ClassicSpinnerComponent,
    RouterLink,
    TurnstileComponent
  ],
  template: `

    @if (userContext.isLoggedOut()) {
      <main class="main-container min-h-screen max-w-[425px] sm:max-w-4xl" role="main" aria-live="polite" [attr.aria-busy]="loading()">
        <div class="flex flex-col items-center px-4">
          <img
            [src]="logoSrc() | public"
            alt="Mercurion Logo"
            class="w-16 h-auto mb-6"
          />

          <!-- Welcome Message -->
          <h1
            id="register-heading"
            class="text-2xl font-semibold text-light-accent-secondary dark:text-dark-accent-secondary text-center tracking-wider"
          >
            Registrati a <span class="text-light-accent-primary-hc dark:text-dark-accent-primary">Mercurion</span>.
          </h1>
        </div>

        @switch (step()) {
          @case (1) {
            <form [formGroup]="form" (ngSubmit)="onSubmit()" aria-labelledby="register-heading" [attr.aria-busy]="loading()">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <m-floating-input
                  label="Nome *"
                  type="text"
                  autocomplete="current-name"
                  formControlName="firstName"
                  [errors]="{
                    required: 'Il nome è obbligatorio.',
                    pattern: 'Il formato del nome non è valido.'
                  }"
                  darkLabelClass = 'dark:text-dark-accent-secondary-hc'
                  darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
                  darkFocusBorderClass = 'dark:focus:border-dark-accent-primary'
              />
              <m-floating-input
                  label="Cognome *"
                  type="text"
                  autocomplete="current-surname"
                  formControlName="lastName"
                  [errors]="{
                    required: 'Il cognome è obbligatorio.',
                    pattern: 'Il formato del cognome non è valido.'
                  }"
                  darkLabelClass = 'dark:text-dark-accent-secondary-hc'
                  darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
                  darkFocusBorderClass = 'dark:focus:border-dark-accent-primary'
              />
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-6">
              <m-floating-input
                  label="E-mail *"
                  type="email"
                  autocomplete="current-email"
                  formControlName="email"
                  [errors]="{
                    required: this.emailRequired,
                    pattern: this.emailMalformed,
                    email: this.emailMalformed,
                    emailTaken: 'E-mail già registrata.'
                  }"
                  [asyncVerify]="true"
                  darkLabelClass = 'dark:text-dark-accent-secondary-hc'
                  darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
                  darkFocusBorderClass = 'dark:focus:border-dark-accent-primary'
              />
              <m-floating-input
                  label="Il tuo lavoro"
                  type="text"
                  autocomplete="current-job"
                  formControlName="job"
                  [errors]="{}"
                  darkLabelClass = 'dark:text-dark-accent-secondary-hc'
                  darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
                  darkFocusBorderClass = 'dark:focus:border-dark-accent-primary'
              />
            </div>
            <m-select label="Genere *"
              [options]="options"
              formControlName="gender"
              [darkFocusClassList]="[
                'dark:focus:ring-dark-accent-primary',
                'dark:focus:border-dark-accent-primary',
                'dark:focus-visible:outline-dark-accent-primary',
                'dark:focus-visible:outline-dark-accent-primary'
              ]">
            </m-select>
            <div class="tflex justify-center mx-auto max-w-[500px] text-sm text-light-error dark:text-dark-error mt-1 min-h-5 mb-8">
              @if (form.controls['gender'].touched && form.controls['gender'].invalid) {
                Genere obbligatorio.
              }
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <m-floating-input
                  label="Password"
                  type="password"
                  autocomplete="current-password"
                  formControlName="password"
                  [errors]="{
                    required: 'La password è obbligatoria.',
                    pattern: 'La password deve essere di almeno 8 caratteri: almeno uno minuscolo, uno maiuscolo, un numero e un carattere speciale.'
                  }"
                  darkLabelClass = 'dark:text-dark-accent-secondary-hc'
                  darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
                  darkFocusBorderClass = 'dark:focus:border-dark-accent-primary'
              />
              <m-floating-input
                  label="Inserisci di nuovo la password"
                  type="password"
                  autocomplete="current-password"
                  formControlName="confirmPassword"
                  [errors]="{
                    required: 'Il campo di conferma password è obbligatorio.',
                    matchPassword: 'Le due password non corrispondono.'
                  }"
                  darkLabelClass = 'dark:text-dark-accent-secondary-hc'
                  darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
                  darkFocusBorderClass = 'dark:focus:border-dark-accent-primary'
              />
            </div>
            <div class="flex gap-3 relative top-2 sm:top-4 justify-center sm:justify-start">
              <div class="flex-col sm:flex-row flex h-6 shrink-0 justify-center gap-y-1 sm:items-center">
                <!-- wrapper visivo -->
                <label class="relative inline-flex items-center gap-2 cursor-pointer select-none">
                  <input id="onlyKnown" type="checkbox" name="onlyKnown" aria-describedby="accept-terms-description"
                    class="peer sr-only" [formControl]="acceptCtrl" role="switch" aria-label="Accetto privacy e termini" [attr.aria-checked]="acceptCtrl.value" />

                  <span class="inline-block size-4 rounded-sm border
                                     border-gray-300 bg-white
                                     peer-checked:bg-blue-600/80 peer-checked:blue-600/80
                                     dark:border-white/10 dark:bg-white/5
                                     dark:peer-checked:bg-dark-accent-primary-btn dark:peer-checked:border-dark-accbg-dark-accent-primary-btn"
                    aria-hidden="true"></span>

                  <svg viewBox="0 0 14 14" fill="none" class="pointer-events-none hidden peer-checked:block
                                     absolute left-[2px] top-1/2 -translate-y-1/2 size-3.5 z-10" aria-hidden="true">
                    <path d="M3 8L6 11L11 3.5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                      class="stroke-white" />
                  </svg>

                  <span id="accept-terms-description" class="inline-block text-sm font-medium text-gray-900 dark:text-white tracking-wider">
                    Dichiaro di aver letto e di accettare l'
                    <a class="a" routerLink="/privacy">Informativa sulla Privacy</a>,
                    i <a class="a" routerLink="/terms-and-policies">Termini di Servizio</a>
                    e la <a class="a" routerLink="/terms-and-policies" fragment="aup">Politica di Utilizzo Accettabile</a>.
                  </span>
                </label>
              </div>
            </div>
            <div class="flex justify-center mt-10">
            @if (loadingTurnstile()) {
              <div
                class="w-[300px] h-[71px] overflow-hidden transition-all bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 animate-pulse skeleton-pulse"
                role="status"
                aria-live="polite"
              >
                <span class="sr-only">Loading CAPTCHA…</span>
              </div>
            }
            <m-turnstile
              (token)="onTurnstileToken($event)"
              (widgetReady)="onTurnstileRender()"
              (refresh)="loadingTurnstile.set(true)"
              class="block h-[71px] relative top-9"
            />
          </div>
            <div class="max-w-sm mx-auto mt-20">
              <button
                type="submit"
                [disabled]="loading() || settedDisabledBtn() || acceptCtrl.value === false || !turnstileToken()"
                class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary-hq dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary-hc dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary-hq/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary-hq/60 disabled:hover:dark:bg-dark-accent-primary/80"
                [attr.aria-disabled]="loading() || settedDisabledBtn() || acceptCtrl.value === false || !turnstileToken()"
                [attr.aria-busy]="loading()"
                aria-label="Completa la registrazione"
              >
                @if (!loading()) {
                  Registrati
                } @else {
                  <div class="text-slate-200 flex items-center justify-center" aria-hidden="true">
                    <m-classic-spinner [size]="24"></m-classic-spinner>
                  </div>
                }
              </button>
            </div>
          </form>
          }
          @case (2) {
            <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row" role="status" aria-live="polite">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-20 h-auto shrink-[0.5] text-emerald-800 dark:text-emerald-400" aria-hidden="true">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 96C196.3 96 96 196.3 96 320C96 443.7 196.3 544 320 544C443.7 544 544 443.7 544 320C544 196.3 443.7 96 320 96zM438.3 236.5L428.9 249.4L300.9 425.4L289.9 440.6L201.3 352L223.9 329.4L286 391.5L403 230.7L412.4 217.8L438.3 236.6z"/>
              </svg>
              <span><strong>La registrazione a Mercurion è avvenuta con successo!</strong> Un'e-mail di conferma è stata inviata a <strong class="text-light-accent-primary-hc dark:text-dark-accent-primary-btn-hc">{{obscuredEmail()}}</strong> con un link per attivare il tuo nuovo account.<br />
                    Affrettati, il link vale soltanto 2 ore a partire da adesso, dopodiché il tuo account verrà cancellato automaticamente!
                    Sarà comunque necessario attivare il proprio account prima di poter fare il primo login.
              </span>
            </div>
          }
        }
      </main>
    }


  `
})
export class RegisterPageComponent implements OnInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly fb = inject(NonNullableFormBuilder)
  private readonly themeManager = inject(ThemeManagerService)
  private readonly authService = inject(AuthService)
  protected readonly userContext = inject(UserContextService)
  private readonly toast = inject(ToastService)
  private readonly appContext = inject(AppContextService)
  // ====================================================

  @ViewChild(TurnstileComponent)
  turnstileComponent!: TurnstileComponent

  private regSub?: Subscription
  private valChSub?: Subscription
  private fSub?: Subscription

  emailRequired = "L'e-mail è obbligatoria."
  emailMalformed = "Il formato dell'e-mail non è corretto."

  step = signal<1 | 2>(1)
  loading = signal<boolean>(false)
  obscuredEmail = signal<string>('')
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
        validators: [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)],
        asyncValidators: [emailAvailabilityValidator(this.authService)],
      }),
      job: new FormControl<string | null>(null, {
        nonNullable: false,
        validators: [Validators.pattern(/^(?:[A-Za-zÀ-Ýà-ÿ]+(?:\s+[A-Za-zÀ-Ýà-ÿ]+)*)?$/)],
      }),
      gender: this.fb.control<UserGenderControl>('', { validators: [Validators.required] }),
      password: this.fb.control('', {
        validators: [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/)],
      }),
      confirmPassword: this.fb.control('', { validators: [Validators.required, matchPassword] }),
    },
    { validators: matchPassword }
  )


  options: PmOption[] = [
    {
      label: '',
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
    }
  ]

  private markAll(): void {
    Object.values(this.form.controls).forEach(control => {
      if (control.invalid) {
        control.markAsTouched();
        control.updateValueAndValidity({ onlySelf: true });
      }
    })
  }

  onSubmit(): void {
    if (this.form.valid) {
      if (!this.turnstileToken()) {
        this.turnstileComponent?.reset()
        this.turnstileToken.set('')
        this.loadingTurnstile.set(true)
        this.loading.set(false)
      }
      this.loading.set(true)
      const { confirmPassword: _omit, ...dto } = this.form.value as UserRegistrationFormValue
      dto.firstName = Helpers.normalizeTitleCase(dto.firstName)
      dto.lastName = Helpers.normalizeTitleCase(dto.lastName)
      this.regSub = this.authService.registerUser(dto, this.turnstileToken()).subscribe({
        next: res => {
          const { obscuredEmail } = res
          this.obscuredEmail.set(obscuredEmail!)
          queueMicrotask(() => {
            this.loading.set(false)
            this.step.set(2)
            this.appContext.smoothToTop(undefined, 240)
          })
        },
        error: () => {
          this.toast.trigger('Si è verificato un errore lato server.', 'error', 3000)
          this.turnstileComponent?.reset()
          this.turnstileToken.set('')
          this.loadingTurnstile.set(true)
          this.loading.set(false)
        }
      })
    } else {
      this.turnstileComponent?.reset()
      this.turnstileToken.set('')
      this.loadingTurnstile.set(true)
      this.settedDisabledBtn.set(true)
      this.toast.trigger('Errore: controlla i campi con le scritte in rosso!')
      this.markAll()
    }
  }

  onTurnstileToken(token: string): void {
    this.turnstileToken.set(token)
  }

  onTurnstileRender(): void {
    this.loadingTurnstile.set(false)
  }

  ngOnInit(): void {
    this.valChSub = this.form.get('password')?.valueChanges.subscribe(() => {
      this.form.get('confirmPassword')?.updateValueAndValidity({ onlySelf: true });
    })
    this.form.valueChanges.subscribe(() => {
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
