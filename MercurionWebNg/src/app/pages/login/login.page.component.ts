import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import { adaptHttpFormError } from '../../utils/form-error.adapter'
import { finalize } from 'rxjs'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ProgressIndicatorComponent } from '../../components/common/progress-indicator/progress-indicator.component';

@Component({
  selector: 'm-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoginCredentialFormComponent, LoginSsoChooserComponent, ProgressIndicatorComponent],
  template: `
    @if (!pageLoading()) {
      <main class="auth-page" aria-labelledby="login-title">
        <div class="auth-container">
          <a routerLink="/" class="auth-link mb-3"><span aria-hidden="true">←</span> Torna alla home</a>
          <section class="auth-card">
            <header class="auth-header">
              <img [src]="logoSrc()" alt="" width="48" height="64" />
              <div><h1 id="login-title" class="auth-title">Accedi a Mercurion</h1>
                <p class="auth-description">Piacere di averti qui. Scegli come accedere.</p></div>
            </header>
            <div class="auth-stack">
          <m-login-sso-chooser
            [redirectTo]="redirectTo()"
          />
          <div class="auth-separator"><span>oppure con le tue credenziali</span></div>
          <m-login-credential-form
            (emailSubmitted)="checkEmail($event)"
            (credentialsSubmitted)="submit($event)"
          />
          <div class="auth-links">
            <a routerLink="/forgot-password" class="auth-link">Password dimenticata?</a>
            <a routerLink="/register" class="auth-link">Registrati</a>
          </div>
          <div class="auth-support">
          <a
            title="Usa il codice di recupero mostrato all’attivazione per recuperare e ripristinare il tuo account"
            routerLink="/account-recovery"
            class="auth-option"
          >
            <svg viewBox="0 0 640 640" class="size-5 fill-current" aria-hidden="true">
              <path d="M592 544H48L320 48l272 496zM292 420v56h56v-56h-56zm-4-196 12.8 160h38.4L352 224h-64z"/>
            </svg>
            <span>Recupera account inaccessibile</span>
          </a>
          <p class="auth-description">Usa il codice di recupero ricevuto all’attivazione se non riesci più ad accedere.</p>
          </div>
          @if (authError(); as error) {
            @if (!credentialForm()?.emailError() && !credentialForm()?.credentialError()) {
              <p class="auth-error" role="alert">{{ error.message ?? 'Si è verificato un errore.' }}</p>
            }
          }
          <p class="auth-terms">
          Continuando con Google, ORCID o Discord, dichiari di aver letto e di accettare la
          <a routerLink="/privacy" class="underline" target="_blank" rel="noopener noreferrer">Informativa sulla Privacy</a>,
          i <a routerLink="/terms-and-policies" class="underline" target="_blank" rel="noopener noreferrer">Termini di Servizio</a>
          e la <a routerLink="/terms-and-policies" fragment="aup" class="underline" target="_blank" rel="noopener noreferrer">Politica di Utilizzo Accettabile</a>.
          &nbsp;Verrà creata automaticamente una sessione di 30 giorni di durata.
        </p>
            </div>
          </section>
        </div>
      </main>
    } @else {
      <main class="auth-page auth-page--pending" aria-label="Accesso in corso">
        <m-progress-indicator />
      </main>
    }
  `,
  styleUrl: './auth-entry.css'
})
export class LoginPageComponent implements OnInit {

  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly theme = inject(ThemeManagerService)
  private readonly facade = inject(AuthFacade)
  private readonly errors = inject(AuthErrorService)
  private readonly redirects = inject(AuthRedirectService)
  private readonly destroyRef = inject(DestroyRef)

  readonly credentialForm = viewChild(LoginCredentialFormComponent)
  readonly redirectTo = signal<string | null>(null)
  readonly authError = this.errors.error
  readonly logoSrc = () => {
    const { PICTOGRAM_LIGHT, PICTOGRAM_DARK } = environment.logoSrc
    return this.theme.theme() === 'light' ? PICTOGRAM_LIGHT : PICTOGRAM_DARK
  }
  readonly pageLoading = signal<boolean>(false)

  ngOnInit(): void {
    const queryRedirect = this.route.snapshot.queryParamMap.get('redirect_to')
    if (queryRedirect != null) this.facade.captureRedirect(queryRedirect)
    this.redirectTo.set(this.redirects.peek())
    this.facade.prepareLogin().subscribe({
      error: () => this.errors.setFromHttp(null, 'login')
    })
  }

  checkEmail(email: string): void {
    const form = this.credentialForm()
    this.errors.beginAttempt()
    form?.clearErrors()
    form?.setPending(true)
    this.facade.checkEmail(email).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => form?.setPending(false))
    ).subscribe({
      next: () => form?.showPasswordStep(),
      error: error => {
        const formError = adaptHttpFormError(error, {
          AUTHENTICATION_INVALID_CREDENTIALS: { email: 'email' }
        })
        this.credentialForm()?.showEmailError(formError.fieldErrors.email ?? formError.globalError ?? "L'e-mail inserita non è corretta")
        this.errors.setFromHttp(error, 'login')
      }
    })
  }

  submit(credentials: LoginCredentials): void {
    const form = this.credentialForm()
    form?.clearErrors()
    form?.setPending(true)
    this.facade.login(credentials).pipe(
      finalize(() => form?.setPending(false))
    )
      .subscribe({
        next: result => this.pageLoading.set(result.kind === 'authenticated'),
        error: error => {
          this.pageLoading.set(false)
          const formError = adaptHttpFormError(error)
          const category = this.errors.setFromHttp(error, 'login')?.category
          if (category === 'invalid-credentials') {
            form?.showCredentialError(formError.globalError ?? 'La password inserita non è corretta.')
          } else if (category === 'rate-limited') {
            form?.showCredentialError(formError.globalError ?? 'Troppi tentativi, riprova tra qualche minuto.')
          } else {
            form?.showCredentialError('Non è stato possibile completare l’accesso. Riprova.')
          }
          form?.resetTurnstile()
        },
        complete: () => form?.setPending(false)
      })
  }

  cancel(): void {
    this.facade.cancelLogin()
    void this.router.navigateByUrl('/login')
  }
}
