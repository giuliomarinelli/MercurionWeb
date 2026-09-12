import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
  viewChild
} from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { ThemeManagerService } from '../../services/context/theme-manager.service'
import { AuthFacade } from '../../services/auth.facade'
import { AuthErrorService } from '../../services/auth-error.service'
import { AuthRedirectService } from '../../services/auth-redirect.service'
import { LoginCredentialFormComponent } from './login-credential-form.component'
import { LoginSsoChooserComponent } from './login-sso-chooser.component'
import type { LoginCredentials } from './login-flow.models'
import { environment } from '../../../environments/environment'

@Component({
  selector: 'm-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoginCredentialFormComponent, LoginSsoChooserComponent],
  template: `
    <main class="min-h-screen flex flex-col items-center px-4 pt-9" role="main" aria-live="polite">
      <img [src]="logoSrc()" alt="Mercurion Logo" class="w-16 h-auto mb-6" />
      <h1 id="login-title" class="text-2xl font-semibold text-gray-900 mb-8 tracking-wider dark:text-slate-100 text-center">
        Piacere di averti qui.
      </h1>
      <div class="w-full max-w-sm space-y-6">
        <m-login-credential-form
          (emailSubmitted)="checkEmail($event)"
          (credentialsSubmitted)="submit($event)"
        />
        <div class="my-3 text-sm flex gap-3 justify-between items-center flex-col 2xs:flex-row">
          <a routerLink="/forgot-password">Password dimenticata?</a>
          <a routerLink="/register">Registrati</a>
        </div>
        <a routerLink="/account-recovery" class="block text-center">Recupera account</a>
        <m-login-sso-chooser
          [redirectTo]="redirectTo()"
          (providerSelected)="selectSso($event.provider, $event.redirectTo)"
        />
        @if (authError(); as error) {
          <p role="alert" aria-live="assertive">{{ error.message ?? 'Si è verificato un errore.' }}</p>
        }
      </div>
    </main>
  `,
  styles: [`
    :host { display: block; }
    a { color: inherit; text-decoration: underline; }
  `]
})
export class LoginPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly theme = inject(ThemeManagerService)
  private readonly facade = inject(AuthFacade)
  private readonly errors = inject(AuthErrorService)
  private readonly redirects = inject(AuthRedirectService)

  readonly credentialForm = viewChild(LoginCredentialFormComponent)
  readonly redirectTo = signal<string | null>(null)
  readonly authError = this.errors.error
  readonly logoSrc = () => {
    const { PICTOGRAM_LIGHT, PICTOGRAM_DARK } = environment.logoSrc
    return this.theme.theme() === 'light' ? PICTOGRAM_LIGHT : PICTOGRAM_DARK
  }

  ngOnInit(): void {
    const queryRedirect = this.route.snapshot.queryParamMap.get('redirect_to')
    if (queryRedirect != null) this.facade.captureRedirect(queryRedirect)
    this.redirectTo.set(this.redirects.peek())
    this.facade.prepareLogin().subscribe({
      error: () => this.errors.setFromHttp(null, 'login')
    })
  }

  checkEmail(email: string): void {
    this.credentialForm()?.setPending(true)
    this.facade.checkEmail(email).subscribe({
      next: () => this.credentialForm()?.showPasswordStep(),
      error: error => {
        this.credentialForm()?.showEmailError("L'e-mail inserita non è corretta")
        this.errors.setFromHttp(error, 'login')
      },
      complete: () => this.credentialForm()?.setPending(false)
    })
  }

  submit(credentials: LoginCredentials): void {
    const form = this.credentialForm()
    form?.clearErrors()
    form?.setPending(true)
    this.facade.login(credentials).subscribe({
      error: error => {
        const category = this.errors.setFromHttp(error, 'login')?.category
        if (category === 'invalid-credentials') {
          form?.showCredentialError('La password inserita non è corretta.')
        } else if (category === 'rate-limited') {
          form?.showCredentialError('Troppi tentativi, riprova tra qualche minuto.')
        }
        form?.resetTurnstile()
      },
      complete: () => form?.setPending(false)
    })
  }

  selectSso(provider: string, redirectTo: string | null): void {
    this.facade.selectSso(provider, redirectTo)
  }

  cancel(): void {
    this.facade.cancelLogin()
    void this.router.navigateByUrl('/login')
  }
}
