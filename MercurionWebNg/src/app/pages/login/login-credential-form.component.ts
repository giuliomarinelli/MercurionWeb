import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
  signal
} from '@angular/core'
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms'
import { TextFieldComponent } from '../../components/common/text-field/text-field.component'
import { SelectionControlComponent } from '../../components/common/selection-control/selection-control.component'
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component'
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
    ClassicSpinnerComponent,
    TurnstileComponent
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="submitCredentials()" aria-labelledby="login-title" [attr.aria-busy]="pending()">
      @if (step() === 1) {
        <m-text-field
          label="Indirizzo e-mail"
          type="email"
          autocomplete="email"
          formControlName="email"
          [errors]="emailErrors"
          [serverError]="emailError()"
          (enter)="submitEmail()"
        />
        <button type="button" (click)="submitEmail()" [disabled]="form.controls.email.invalid"
          aria-label="Continua con l'e-mail inserita">
          Continua
        </button>
      } @else {
        <m-text-field
          label="Indirizzo e-mail"
          type="email"
          autocomplete="email"
          formControlName="email"
          [errors]="emailErrors"
          [serverError]="emailError()"
          [disabled]="pending()"
        />
        <m-text-field
          label="Password"
          type="password"
          autocomplete="current-password"
          formControlName="password"
          [errors]="{ required: 'Password obbligatoria.' }"
          [serverError]="credentialError()"
        />
        <button type="submit" [disabled]="!canSubmit()" [attr.aria-busy]="pending()"
          aria-label="Accedi al tuo account">
          @if (pending()) { <m-classic-spinner [size]="24" /> } @else { Accedi }
        </button>
        @if (!turnstileDisabled) {
          <m-turnstile
            (token)="onTurnstileToken($event)"
            (widgetReady)="turnstileReady.emit()"
            (refresh)="turnstileLoading.set(true)"
          />
        }
      }
      <m-selection-control
        label="Ricordami per 30 giorni"
        name="setting"
        mode="switch"
        formControlName="remember"
      />
    </form>
  `,
  styles: [`
    :host { display: block; }
    form { display: grid; gap: 1rem; }
    button { width: 100%; padding: .55rem; border-radius: .375rem; }
  `]
})
export class LoginCredentialFormComponent {
  private readonly appConfig = inject(APP_CONFIG)

  readonly form = new FormGroup<CredentialForm>({
    email: new FormControl('', { nonNullable: true, validators: [
      Validators.required,
      Validators.email,
      Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    ] }),
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

  canSubmit(): boolean {
    return this.form.valid && (this.turnstileDisabled || Boolean(this.turnstileToken()))
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
  }

  onTurnstileToken(token: string): void {
    this.turnstileToken.set(token)
    this.turnstile.emit(token)
  }
}
