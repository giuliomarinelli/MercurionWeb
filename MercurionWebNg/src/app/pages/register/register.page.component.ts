import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { PublicPipe } from '../../pipes/public.pipe';
import { ReactiveFormsModule, Validators, FormGroup, FormControl, NonNullableFormBuilder } from '@angular/forms';
import { ThemeManagerService } from '../../services/context/theme-manager.service';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/context/user-context.service';
import { environment } from '../../../environments/environment.development';
import { Subscription, switchMap } from 'rxjs';
import { FloatingInputComponent } from '../../components/common/floating-input/floating-input.component';
import { PmSelectComponent } from '../../components/common/pm-select/pm-select.component';
import { emailAvailabilityValidator, matchPassword } from '../../custom-validators';
import { UserGenderControl, UserRegistrationFormControls, UserRegistrationFormValue } from '../../Models/auth/user.models';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { Helpers } from '../../helpers';
import { ToastService } from '../../services/toast.service';
import { AppContextService } from '../../services/context/app-context.service';
import { PmOption } from '../../Models/pm-option.model';


@Component({
  selector: 'm-register.page',
  imports: [
    PublicPipe,
    ReactiveFormsModule,
    FloatingInputComponent,
    PmSelectComponent,
    ClassicSpinnerComponent
  ],
  template: `

    @if (userContext.isLoggedOut()) {
      <div class="main-container min-h-screen max-w-[425px] sm:max-w-4xl">
        <div class="flex flex-col items-center px-4">
          <img
            [src]="logoSrc() | public"
            alt="Mercurion Logo"
            class="w-16 h-auto mb-6"
          />

          <!-- Welcome Message -->
          <h1
            class="text-2xl font-semibold text-light-accent-secondary dark:text-dark-accent-secondary text-center tracking-wider"
          >
            Registrati a <span class="text-light-accent-primary dark:text-dark-accent-primary">Mercurion</span>.
          </h1>
        </div>

        @switch (step()) {
          @case (1) {
            <form [formGroup]="form" (ngSubmit)="onSubmit()">
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
              />
              <m-floating-input
                  label="Il tuo lavoro"
                  type="text"
                  autocomplete="current-job"
                  formControlName="job"
                  [errors]="{}"
              />
            </div>
            <m-select label="Genere *"
              [options]="options"
              formControlName="gender">
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
              />
            </div>
            <div class="max-w-sm mx-auto mt-20">
              <button
                type="submit"
                [disabled]="loading() || settedDisabledBtn()"
                class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary/80 dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
              >
                @if (!loading()) {
                  Registrati
                } @else {
                  <div class="text-slate-200 flex items-center justify-center">
                    <m-classic-spinner [size]="24"></m-classic-spinner>
                  </div>
                }
              </button>
            </div>
            </form>
          }
          @case (2) {
            <div class="bg-slate-200 dark:bg-slate-800 border my-16 border-slate-300 dark:border-slate-600 relative p-3 mx-auto max-w-[1024px] rounded-md text-sm flex gap-2 xs:gap-4 items-center flex-col xs:flex-row">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current w-20 h-auto shrink-[0.5] text-emerald-800 dark:text-emerald-400">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path d="M320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576zM320 128C214 128 128 214 128 320C128 426 214 512 320 512C426 512 512 426 512 320C512 214 426 128 320 128zM439.6 272L419.8 291.8L307.8 403.8C296.9 414.7 279.1 414.7 268.2 403.8C231.5 367.1 208.9 344.5 200.4 336L240 296.4C251.8 308.2 267.8 324.2 288 344.4L380.2 252.2L400 232.4L439.6 272z"/>
              </svg>
              <span><strong>La registrazione a Mercurion è avvenuta con successo!</strong> Un'e-mail di conferma è stata inviata a <strong class="text-light-accent-primary dark:text-dark-accent-primary">{{obscuredEmail()}}</strong> con un link per attivare il tuo nuovo account.<br />
                    Affrettati, il link vale soltanto 2 ore a partire da adesso, dopodiché il tuo account verrà cancellato automaticamente!
                    Sarà comunque necessario attivare il proprio account prima di poter fare il primo login.
              </span>
            </div>
          }
        }
      </div>
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

  private regSub?: Subscription
  private valChSub?: Subscription
  private fSub?:Subscription

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
  );


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
      this.loading.set(true)
      const { confirmPassword: _omit, ...dto } = this.form.value as UserRegistrationFormValue
      dto.firstName = Helpers.normalizeTitleCase(dto.firstName)
      dto.lastName = Helpers.normalizeTitleCase(dto.lastName)
      this.regSub = this.authService.registerUser(dto).subscribe({
        next: res => {
          const { obscuredEmail } = res
          this.obscuredEmail.set(obscuredEmail!)
          queueMicrotask(() => {
            this.loading.set(false)
            this.step.set(2)
            this.appContext.triggerScrollToTopGlobally()
          })
        },
        error: () => {
          this.toast.trigger('Si è verificato un errore lato server.', 'error', 3000)
          this.loading.set(false)
        }
      })
    } else {
      this.settedDisabledBtn.set(true)
      this.toast.trigger('Errore: controlla i campi con le scritte in rosso!')
      this.markAll()
    }
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
