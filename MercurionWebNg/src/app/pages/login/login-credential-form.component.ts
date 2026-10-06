import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output,
  signal,
  viewChild
} from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms'
import { TextFieldComponent } from '../../components/common/text-field/text-field.component'
import { SelectionControlComponent } from '../../components/common/selection-control/selection-control.component'
import { ButtonPendingContentComponent } from '../../components/common/button/button-pending-content.component'
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component'
import { APP_CONFIG } from '../../config/app-config'
import type { LoginCredentials } from './login-flow.models'

type CredentialForm = {
  email: FormControl<string>
  password: FormControl<string>
  remember: FormControl<boolean>
}

@Component({
  selector: 'm-login-credential-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TextFieldComponent,
    SelectionControlComponent,
    ButtonPendingContentComponent,
    TurnstileComponent
  ],
  template: `
    <form id="login-form" name="login" autocomplete="on" [formGroup]="form" (ngSubmit)="submitCredentials()" aria-labelledby="login-title" [attr.aria-busy]="pending()">
        <m-text-field
          id="login-email"
          name="email"
          label="Indirizzo e-mail"
          type="email"
          autocomplete="username"
          formControlName="email"
          [errors]="emailErrors"
          [serverError]="emailError()"
          [disabled]="step() === 2 && pending()"
          (enter)="step() === 1 ? submitEmail() : null"
        />
      @if (step() === 1) {
        <button type="button" (click)="submitEmail()" [disabled]="form.controls.email.invalid"
          class="relative bottom-[10px] mt-1 w-full rounded-md bg-light-accent-primary-hq py-2 text-white transition-colors duration-150 hover:bg-light-accent-primary-hc disabled:cursor-not-allowed disabled:bg-light-accent-primary-hq/60 disabled:hover:bg-light-accent-primary-hq/60 dark:bg-dark-accent-primary-btn dark:disabled:bg-dark-accent-primary/80 dark:disabled:hover:bg-dark-accent-primary/80"
          [attr.aria-disabled]="form.controls.email.invalid"
          aria-label="Continua con l'e-mail inserita">
          Continua
        </button>
      } @else {
        <m-text-field
          id="login-password"
          name="password"
          label="Password"
          type="password"
          autocomplete="current-password"
          formControlName="password"
          [errors]="{ required: 'Password obbligatoria.' }"
          [serverError]="credentialError()"
        />
        <button type="submit" [disabled]="!canSubmit()" [attr.aria-busy]="pending()"
          class="flex justify-center items-center mt-4 w-full rounded-md bg-light-accent-primary-hq py-2 text-white transition-colors duration-150 hover:bg-light-accent-primary-hc disabled:cursor-not-allowed disabled:bg-light-accent-primary-hq/60 disabled:hover:bg-light-accent-primary-hq/60 dark:bg-dark-accent-primary-btn dark:hover:bg-dark-accent-primary/80 dark:disabled:bg-dark-accent-primary/80 dark:disabled:hover:bg-dark-accent-primary/80 h-10"
          [attr.aria-disabled]="!canSubmit()"
          aria-label="Accedi al tuo account">
          <m-button-pending-content [pending]="pending()">Accedi</m-button-pending-content>
        </button>
        @if (!turnstileDisabled) {
          <div class="flex justify-center relative top-3 mb-3">
            <div class="relative w-[300px] h-[71px]">
              @if (turnstileLoading()) {
                <div
                  class="absolute inset-0 overflow-hidden bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 animate-pulse skeleton-pulse"
                >
                  <span class="sr-only">Loading CAPTCHA…</span>
                </div>
              }
              <m-turnstile
                (token)="onTurnstileToken($event)"
                (widgetReady)="onTurnstileReady()"
                (refresh)="turnstileLoading.set(true)"
                class="block h-[71px]"
                [class.invisible]="turnstileLoading()"
              />
            </div>
          </div>
        }
      }
      <div class="flex justify-center">
        <m-selection-control
          class="text-sm text-gray-600 dark:text-gray-300"
          label="Ricordami per 30 giorni"
          name="setting"
          mode="switch"
          formControlName="remember"
        />
      </div>
    </form>
  `,
  styles: [`
    :host { display: block; }
    form { display: grid; gap: 1rem; }
  `]
})
export class LoginCredentialFormComponent {
  private readonly appConfig = inject(APP_CONFIG)
  private readonly destroyRef = inject(DestroyRef)
  private readonly turnstileComponent = viewChild(TurnstileComponent)

  readonly form = new FormGroup<CredentialForm>({
    email: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      ]
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    remember: new FormControl(false, { nonNullable: true })
  })

  readonly step = signal<1 | 2>(1)
  readonly pending = signal(false)
  readonly turnstileLoading = signal(true)
  readonly turnstileToken = signal('')
  readonly emailError = signal<string | null>(null)
  readonly credentialError = signal<string | null>(null)
  readonly turnstileDisabled = this.appConfig.capabilities.disableTurnstile
  readonly emailErrors = {
    required: 'E-mail obbligatoria.',
    email: 'Formato e-mail non corretto',
    pattern: 'Formato e-mail non corretto'
  }

  readonly emailSubmitted = output<string>()
  readonly credentialsSubmitted = output<LoginCredentials>()
  readonly turnstile = output<string>()
  readonly turnstileReady = output<void>()

  constructor() {
    this.form.controls.email.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.emailError.set(null)
        this.credentialError.set(null)
        if (this.step() === 2) {
          this.step.set(1)
          this.form.controls.password.reset()
          this.resetTurnstile()
        }
      })

    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.credentialError.set(null))

  }

  canSubmit(): boolean {
    return !this.pending() && this.form.valid && (this.turnstileDisabled || Boolean(this.turnstileToken()))
  }

  submitEmail(): void {
    if (this.form.controls.email.invalid) return
    this.emailSubmitted.emit(this.form.controls.email.value)
  }

  submitCredentials(): void {
    if (!this.canSubmit()) return
    this.credentialsSubmitted.emit({
      email: this.form.controls.email.value,
      password: this.form.controls.password.value,
      remember: this.form.controls.remember.value,
      turnstileToken: this.turnstileToken()
    })
  }

  setPending(value: boolean): void {
    this.pending.set(value)
  }

  showPasswordStep(): void {
    this.emailError.set(null)
    this.turnstileLoading.set(true)
    this.step.set(2)
  }

  showEmailError(message: string): void {
    this.emailError.set(message)
  }

  showCredentialError(message: string): void {
    this.credentialError.set(message)
  }

  clearErrors(): void {
    this.emailError.set(null)
    this.credentialError.set(null)
  }

  resetTurnstile(): void {
    this.turnstileToken.set('')
    if (this.step() === 2) this.turnstileComponent()?.reset()
  }

  onTurnstileToken(token: string): void {
    this.turnstileToken.set(token)
    this.turnstile.emit(token)
  }

  onTurnstileReady(): void {
    this.turnstileLoading.set(false)
    this.turnstileReady.emit()
  }
}
