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
import { adaptHttpFormError } from '../../utils/form-error.adapter'
import { finalize } from 'rxjs'
import { ProgressIndicatorComponent } from '../../components/common/progress-indicator/progress-indicator.component';

@Component({
  selector: 'm-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, LoginCredentialFormComponent, LoginSsoChooserComponent, ProgressIndicatorComponent],
  template: `
    @if (!pageLoading()) {
      <main class="flex flex-col items-center px-4 py-6" role="main" aria-live="polite">
        <img [src]="logoSrc()" alt="Mercurion Logo" class="w-16 h-auto mb-6" />
        <h1 id="login-title" class="text-2xl font-semibold text-gray-900 mb-8 tracking-wider dark:text-slate-100 text-center">
          Piacere di averti qui.
        </h1>
        <div class="w-full max-w-sm space-y-6">
          <m-login-sso-chooser
            [redirectTo]="redirectTo()"
          />
          <div class="relative">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t"></div></div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-light-surface-main px-2 text-gray-500 dark:bg-neutral-950 dark:text-slate-300 uppercase">oppure</span>
            </div>
          </div>
          <m-login-credential-form
            (emailSubmitted)="checkEmail($event)"
            (credentialsSubmitted)="submit($event)"
          />
          <div class="my-3 text-sm flex gap-3 justify-between items-center flex-col 2xs:flex-row">
            <a routerLink="/forgot-password" class="login-secondary-link text-light-accent-primary-hc hover:underline dark:text-dark-accent-primary">Password dimenticata?</a>
            <a routerLink="/register" class="login-secondary-link text-light-accent-primary-hc hover:underline dark:text-dark-accent-primary">Registrati</a>
          </div>
          <div class="relative py-2">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t"></div></div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-light-surface-main px-2 text-gray-500 dark:bg-neutral-950 dark:text-slate-300">IN CASO DI EMERGENZA</span>
            </div>
          </div>
          <a
            title="Usa il codice di recupero mostrato all’attivazione per recuperare e ripristinare il tuo account"
            routerLink="/account-recovery"
            class="flex w-full items-center justify-center gap-3 rounded-md border border-blue-800 dark:border-slate-50 text-blue-800 dark:text-slate-50 py-2.5 text-sm transition-colors duration-150 hover:bg-blue-800 hover:text-slate-50 dark:bg-transparent dark:hover:bg-slate-100 dark:hover:text-neutral-900 font-medium dark:font-regular"
          >
            <svg viewBox="0 0 640 640" class="size-5 fill-current" aria-hidden="true">
              <path d="M592 544H48L320 48l272 496zM292 420v56h56v-56h-56zm-4-196 12.8 160h38.4L352 224h-64z"/>
            </svg>
            <span class="hidden text-[0.85rem] sm:block">Recupera account inaccessibile o hackerato</span>
            <span class="block text-xs sm:hidden">Recupera account</span>
          </a>
          @if (authError(); as error) {
            <p role="alert" aria-live="assertive">{{ error.message ?? 'Si è verificato un errore.' }}</p>
          }
          <p class="text-center text-[0.675rem] text-slate-600 dark:text-slate-300">
          Continuando con un Google, ORCID o Discord, dichiari di aver letto e di accettare la
          <a routerLink="/privacy" class="underline" target="_blank" rel="noopener noreferrer">Informativa sulla Privacy</a>,
          i <a routerLink="/terms-and-policies" class="underline" target="_blank" rel="noopener noreferrer">Termini di Servizio</a>
          e la <a routerLink="/terms-and-policies" fragment="aup" class="underline" target="_blank" rel="noopener noreferrer">Politica di Utilizzo Accettabile</a>.
          &nbsp;Verrà creata automaticamente una sessione di 30 giorni di durata.
        </p>
        </div>
      </main>
    } @else {
      <main class="absolute inset-0 flex items-center justify-center">
        <m-progress-indicator />
      </main>
    }
  `,
  styles: [`
    @reference "../../../styles.css";
    :host {
      display: block;
    }
    .login-secondary-link {
      @apply underline text-light-accent-primary-hc dark:text-dark-accent-primary;
    }
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
    this.credentialForm()?.setPending(true)
    this.facade.checkEmail(email).subscribe({
      next: () => this.credentialForm()?.showPasswordStep(),
      error: error => {
        const formError = adaptHttpFormError(error, {
          AUTHENTICATION_INVALID_CREDENTIALS: { email: 'email' }
        })
        this.credentialForm()?.showEmailError(formError.fieldErrors.email ?? formError.globalError ?? "L'e-mail inserita non è corretta")
        this.errors.setFromHttp(error, 'login')
      },
      complete: () => this.credentialForm()?.setPending(false)
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
