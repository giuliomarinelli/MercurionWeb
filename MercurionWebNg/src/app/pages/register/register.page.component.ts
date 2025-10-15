import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { PublicPipe } from '../../pipes/public.pipe';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl, NonNullableFormBuilder } from '@angular/forms';
import { ThemeManagerService } from '../../services/context/theme-manager.service';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/context/user-context.service';
import { environment } from '../../../environments/environment.development';
import { Subscription, switchMap } from 'rxjs';
import { FloatingInputComponent } from '../../components/common/floating-input/floating-input.component';
import { PmOption, PmSelectComponent } from '../../components/common/pm-select/pm-select.component';
import { emailAvailabilityValidator, matchPassword } from '../../custom-validators';
import { UserGender, UserRegisterDTO, UserRegistrationFormControls, UserRegistrationFormValue } from '../../Models/auth/user.models';
import { JsonPipe } from '@angular/common';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';


@Component({
  selector: 'app-register.page',
  imports: [
    PublicPipe,
    ReactiveFormsModule,
    FloatingInputComponent,
    PmSelectComponent,
    JsonPipe
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
              <app-floating-input
                  label="Nome *"
                  type="text"
                  autocomplete="current-name"
                  formControlName="firstName"
                  [errors]="{
                    required: 'Il nome è obbligatorio.',
                    pattern: 'Il formato del nome non è valido.'
                  }"
              />
              <app-floating-input
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
              <app-floating-input
                  label="E-mail *"
                  type="email"
                  autocomplete="current-email"
                  formControlName="email"
                  [errors]="{
                    required: this.emailRequired,
                    pattern: this.emailMalformed,
                    emailTaken: 'E-mail già registrata.'
                  }"
                  [asyncVerify]="true"
              />
              <app-floating-input
                  label="Il tuo lavoro"
                  type="text"
                  autocomplete="current-job"
                  formControlName="job"
                  [errors]="{}"
              />
            </div>
            <pm-select label="Genere *"
              [options]="options"
              formControlName="gender">
            </pm-select>
            <div class="tflex justify-center mx-auto max-w-[500px] text-sm text-light-error dark:text-dark-error mt-1 min-h-5 mb-8">
              @if (form.controls['gender'].touched && form.controls['gender'].invalid) {
                Genere obbligatorio.
              }
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
              <app-floating-input
                  label="Password"
                  type="password"
                  autocomplete="current-password"
                  formControlName="password"
                  [errors]="{
                    required: 'La password è obbligatoria.',
                    pattern: 'La password deve essere di almeno 8 caratteri: almeno uno minuscolo, uno maiuscolo, un numero e un carattere speciale.'
                  }"
              />
              <app-floating-input
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
              [disabled]="false"
              class="relative bottom-[10px] w-full mt-1 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary/80 dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
             >
              Continua
              </button>
            </div>
            </form>
          }
          @case (2) {
            {{ form.value | json }}
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
  // ====================================================

  private regSub?: Subscription
  private valChSub?: Subscription

  emailRequired = "L'e-mail è obbligatoria."
  emailMalformed = "Il formato dell'e-mail non è corretto."

  step = signal<1 | 2>(1)
  loading = signal<boolean>(false)
  obscuredEmail = signal<string>('')
  logoSrc = computed(() => {
    const { PICTOGRAM_LIKE, PICTOGRAM_DARK } = environment.logoSrc
    return this.themeManager.theme() === 'light' ? PICTOGRAM_LIKE : PICTOGRAM_DARK
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
        validators: [Validators.pattern(/^[A-ZÀ-Ýa-zà-ÿ0-9\s]+$/)],
      }),
      gender: this.fb.control<UserGender>('M', { validators: [Validators.required] }),
      password: this.fb.control('', {
        validators: [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/)],
      }),
      confirmPassword: this.fb.control('', { validators: [Validators.required] }),
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
    });
  }

  onSubmit(): void {
    if (this.form.valid) {
      this.loading.set(true)
      const { confirmPassword: _omit, ...dto } = this.form.value as UserRegistrationFormValue
      this.regSub = this.authService.registerUser(dto).subscribe({
        next: res => {
          const { obscuredEmail } = res
          this.obscuredEmail.set(obscuredEmail!)
        },
        error: (e) => console.error('SERVER ERROR', e)
      })
      this.step.set(2)
    } else {
      this.markAll()
    }
  }

  ngOnInit(): void {
    this.valChSub = this.form.get('password')?.valueChanges.subscribe(() => {
      this.form.get('confirmPassword')?.updateValueAndValidity({ onlySelf: true });
    })
  }

  ngOnDestroy(): void {
    this.regSub?.unsubscribe()
    this.valChSub?.unsubscribe()
  }

}
