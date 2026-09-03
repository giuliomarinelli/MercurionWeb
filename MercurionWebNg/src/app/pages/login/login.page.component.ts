import { Component, computed, effect, inject, OnDestroy, OnInit, Signal, signal, ViewChild } from '@angular/core'
import { FormBuilder, FormControlStatus, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { toSignal } from '@angular/core/rxjs-interop'
import { Subscription, tap } from 'rxjs'

import { ThemeManagerService } from '../../services/context/theme-manager.service'
import { PublicPipe } from '../../pipes/public.pipe'
import { AuthService } from '../../services/auth.service'
import { FingerprintService } from '../../services/fingerprint.service'
import { UserContextService } from '../../services/context/user-context.service'
import { SessionSyncService } from '../../services/session-sync.service'

import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component'
import { FloatingInputComponent } from '../../components/common/floating-input/floating-input.component'
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component'

import { HttpErrorBody } from '../../Models/http-error-body.dto'
import { Confirm_Login_FirstStepDTO } from '../../Models/confirm.models'
import type { SessionDeviceInfo } from '@mercurion/rest-contracts'
import { Login_FirstStepWrapper } from '../../Models/auth/login.models'
import { environment } from '../../../environments/environment.development'
import { SSO_AuthProvider } from '../../Models/auth/provider.models'

@Component({
  selector: 'm-login',
  imports: [
    ReactiveFormsModule,
    PublicPipe,
    TurnstileComponent,
    FloatingInputComponent,
    RouterLink,
    ClassicSpinnerComponent
  ],
  template: `
@if (templateIsMounted()) {
  <main class="min-h-screen flex flex-col items-center px-4 pt-9" role="main" aria-live="polite" [attr.aria-busy]="loadingLogin()">
    <img [src]="logoSrc() | public" alt="Mercurion Logo" class="w-16 h-auto mb-6" />
    <h1 id="login-title" class="text-2xl font-semibold text-gray-900 mb-8 tracking-wider dark:text-slate-100 text-center">
      Piacere di averti qui.
    </h1>

    <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="w-full max-w-sm space-y-6" aria-labelledby="login-title" [attr.aria-busy]="loadingLogin()">
      @if (step() === 1) {
        <div class="mt-2">
          <m-floating-input
            label="Indirizzo e-mail"
            type="email"
            autocomplete="email"
            formControlName="email"
            [errors]="{
              required: 'E-mail obbligatoria.',
              email: 'Formato e-mail non corretto',
              pattern: 'Formato e-mail non corretto'
            }"
            [serverError]="serverErrorStep() === 1 ? uncorrectEmailMsg : null"
            (enter)="goToPasswordStep()"
            darkLabelClass = 'dark:text-dark-accent-secondary-hc'
            darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
            darkFocusBorderClass = 'dark:focus:border-dark-accent-primary'
          />
        </div>
        <button
          type="button"
          (click)="goToPasswordStep()"
          [disabled]="loginForm.controls['email'].invalid"
          class="relative bottom-[10px] w-full mt-1 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary-hq dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary-hc disabled:bg-light-accent-primary-hq/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary-hq/60 disabled:hover:dark:bg-dark-accent-primary/80"
          [attr.aria-disabled]="loginForm.controls['email'].invalid"
          aria-label="Continua con l'e-mail inserita"
        >
          Continua
        </button>
      } @else if (step() === 2) {
        <div class="relative mb-3 mt-2">
          <m-floating-input
            label="Indirizzo e-mail"
            type="email"
            autocomplete="email"
            formControlName="email"
            [errors]="{
              required: 'E-mail obbligatoria.',
              email: 'Formato e-mail non corretto',
              pattern: 'Formato e-mail non corretto'
            }"
            [disabled]="goingToPasswordStep()"
            [serverError]="serverErrorStep() === 1 ? uncorrectEmailMsg : null"
            (enter)="goToPasswordStep()"
            darkLabelClass = 'dark:text-dark-accent-secondary-hc'
            darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
            darkFocusBorderClass = 'dark:focus:border-dark-accent-primary'
          />
        </div>

        <div class="relative">
          <m-floating-input
            label="Password"
            type="password"
            autocomplete="current-password"
            formControlName="password"
            [errors]="{ required: 'Password obbligatoria.' }"
            [serverError]="
              serverErrorStep() === 2
                ? 'La password inserita non è corretta.'
                : serverErrorStep() === 2429 ? 'Troppi tentativi, riprova tra qualche minuto.'
                : null
            "
            darkLabelClass = 'dark:text-dark-accent-secondary-hc'
            darkFocusRingClass = 'dark:focus:ring-dark-accent-primary'
            darkFocusBorderClass = 'dark:focus:border-dark-accent-primary'
          />

          <button
            type="submit"
            [disabled]="!canLogin() || loadingLogin()"
            class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary-hq dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary-hc dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary-hq/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary-hq/60 disabled:hover:dark:bg-dark-accent-primary/80"
            [attr.aria-disabled]="!canLogin() || loadingLogin()"
            [attr.aria-busy]="loadingLogin()"
            aria-label="Accedi al tuo account"
          >
            @if (!loadingLogin()) { Accedi } @else {
              <div class="text-slate-200 flex items-center justify-center" aria-hidden="true">
                <m-classic-spinner [size]="24"></m-classic-spinner>
              </div>
            }
          </button>
        </div>

        <div class="flex justify-center">
          @if (loadingTurnstile()) {
            <div class="w-[300px] h-[71px] overflow-hidden transition-all bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 animate-pulse skeleton-pulse" role="status" aria-live="polite">
              <span class="sr-only">Loading CAPTCHA…</span>
            </div>
          }
          <m-turnstile
            (token)="onTurnstileToken($event)"
            (widgetReady)="onTurnstileRender()"
            (refresh)="loadingTurnstile.set(true)"
            class="block h-[71px] mt-1"
          />
        </div>
      }

      <div class="my-3 text-sm flex gap-3 justify-between items-center flex-col 2xs:flex-row">
        <a routerLink="/forgot-password" class="text-light-accent-primary-hc dark:text-dark-accent-primary hover:underline">Password dimenticata?</a>
        <a routerLink="/register" class="text-light-accent-primary-hc dark:text-dark-accent-primary hover:underline">Registrati</a>
      </div>

      <div class="text-sm text-center text-gray-600 dark:text-gray-300 flex items-center justify-center gap-3">
        <label class="group relative inline-flex w-11 shrink-0 rounded-full bg-gray-200 p-0.5 inset-ring inset-ring-gray-900/5 outline-offset-2 outline-dark-accent-primary transition-colors duration-200 ease-in-out has-[:checked]:bg-dark-accent-primary has-[:focus-visible]:outline-2 dark:bg-neutral-800 dark:inset-ring-white/10 dark:outline-dark-accent-primary/60 dark:has-[:checked]:bg-acceoutline-dark-accent-primary/60">
          <input
            type="checkbox"
            formControlName="remember"
            name="setting"
            aria-label="Ricordami per 30 giorni"
            role="switch"
            [attr.aria-checked]="loginForm.value['remember']"
            class="absolute inset-0 appearance-none cursor-pointer focus:outline-hidden"
          />
          <span class="size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-[:checked]:translate-x-5"></span>
        </label>
        <p class="text-sm">Ricordami per 30 giorni</p>
      </div>

      <div class="relative py-2">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t"></div></div>
        <div class="relative flex justify-center text-sm">
          <span class="bg-light-surface-main dark:bg-neutral-950 px-2 text-gray-500 dark:text-slate-300">IN CASO DI EMERGENZA</span>
        </div>
      </div>

      <a
        title="Usa il codice di recupero mostrato all’attivazione per recuperare e ripristinare il tuo account"
        routerLink="/account-recovery"
        class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-5 w-auto">
          <path d="M592 544L48 544L320 48L592 544zM292 420L292 476L348 476L348 420L292 420zM288 224L300.8 384L339.2 384L352 224L288 224z"/>
        </svg>
        <span class="text-[0.85rem] hidden sm:block">Recupera account inaccessibile o hackerato</span>
        <span class="text-xs block sm:hidden">Recupera account</span>
      </a>

      <div class="relative py-2">
        <div class="absolute inset-0 flex items-center"><div class="w-full border-t"></div></div>
        <div class="relative flex justify-center text-sm">
          <span class="bg-light-surface-main dark:bg-neutral-950 px-2 text-gray-500 dark:text-slate-300">OPPURE</span>
        </div>
      </div>

      <div class="space-y-3 dark:text-slate-100">
        <a [attr.href]="computeSsoLoginHref('Google')" class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150" aria-label="Continua con Google">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-auto" viewBox="0 0 488 512">
            <path class="fill-current"
              d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
            />
          </svg>
          <span>Continua con Google</span>
        </a>
        @if (false) {
          <a [attr.href]="computeSsoLoginHref('LinkedIn')" class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150" aria-label="Continua con LinkedIn">
            <div class="relative">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-auto fill-current absolute -top-[4px] -left-[34px]" viewBox="0 0 640 640" aria-hidden="true">
                <path d="M160 96C124.7 96 96 124.7 96 160L96 480C96 515.3 124.7 544 160 544L480 544C515.3 544 544 515.3 544 480L544 160C544 124.7 515.3 96 480 96L160 96zM165 266.2L231.5 266.2L231.5 480L165 480L165 266.2zM236.7 198.5C236.7 219.8 219.5 237 198.2 237C176.9 237 159.7 219.8 159.7 198.5C159.7 177.2 176.9 160 198.2 160C219.5 160 236.7 177.2 236.7 198.5zM413.9 480L413.9 376C413.9 351.2 413.4 319.3 379.4 319.3C344.8 319.3 339.5 346.3 339.5 374.2L339.5 480L273.1 480L273.1 266.2L336.8 266.2L336.8 295.4L337.7 295.4C346.6 278.6 368.3 260.9 400.6 260.9C467.8 260.9 480.3 305.2 480.3 362.8L480.3 480L413.9 480z"/>
              </svg>
              <span>Continua con LinkedIn</span>
            </div>
          </a>
        }
        <a [attr.href]="computeSsoLoginHref('GitHub')" class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150" aria-label="Continua con GitHub">
          <div class="relative">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-[26px] w-auto fill-current absolute -top-3 -left-[22px]" viewBox="0 0 640 640" aria-hidden="true">
              <path d="M316.8 72C178.1 72 72 177.3 72 316C72 426.9 141.8 521.8 241.5 555.2C254.3 557.5 258.8 549.6 258.8 543.1C258.8 536.9 258.5 502.7 258.5 481.7C258.5 481.7 188.5 496.7 173.8 451.9C173.8 451.9 162.4 422.8 146 415.3C146 415.3 123.1 399.6 147.6 399.9C147.6 399.9 172.5 401.9 186.2 425.7C208.1 464.3 244.8 453.2 259.1 446.6C261.4 430.6 267.9 419.5 275.1 412.9C219.2 406.7 162.8 398.6 162.8 302.4C162.8 274.9 170.4 261.1 186.4 243.5C183.8 237 175.3 210.2 189 175.6C209.9 169.1 258 202.6 258 202.6C278 197 299.5 194.1 320.8 194.1C342.1 194.1 363.6 197 383.6 202.6C383.6 202.6 431.7 169 452.6 175.6C466.3 210.3 457.8 237 455.2 243.5C471.2 261.2 481 275 481 302.4C481 398.9 422.1 406.6 366.2 412.9C375.4 420.8 383.2 435.8 383.2 459.3C383.2 493 382.9 534.7 382.9 542.9C382.9 549.4 387.5 557.3 400.2 555C500.2 521.8 568 426.9 568 316C568 177.3 455.5 72 316.8 72z"/>
            </svg>
          </div>
          <span>Continua con GitHub</span>
        </a>

        <a [attr.href]="computeSsoLoginHref('Discord')" class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150" aria-label="Continua con Discord">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-auto fill-current" viewBox="0 0 640 640" aria-hidden="true">
            <path d="M524.5 133.8C524.3 133.5 524.1 133.2 523.7 133.1C485.6 115.6 445.3 103.1 404 96C403.6 95.9 403.2 96 402.9 96.1C402.6 96.2 402.3 96.5 402.1 96.9C396.6 106.8 391.6 117.1 387.2 127.5C342.6 120.7 297.3 120.7 252.8 127.5C248.3 117 243.3 106.8 237.7 96.9C237.5 96.6 237.2 96.3 236.9 96.1C236.6 95.9 236.2 95.9 235.8 95.9C194.5 103 154.2 115.5 116.1 133C115.8 133.1 115.5 133.4 115.3 133.7C39.1 247.5 18.2 358.6 28.4 468.2C28.4 468.5 28.5 468.7 28.6 469C28.7 469.3 28.9 469.4 29.1 469.6C73.5 502.5 123.1 527.6 175.9 543.8C176.3 543.9 176.7 543.9 177 543.8C177.3 543.7 177.7 543.4 177.9 543.1C189.2 527.7 199.3 511.3 207.9 494.3C208 494.1 208.1 493.8 208.1 493.5C208.1 493.2 208.1 493 208 492.7C207.9 492.4 207.8 492.2 207.6 492.1C207.4 492 207.2 491.8 206.9 491.7C191.1 485.6 175.7 478.3 161 469.8C160.7 469.6 160.5 469.4 160.3 469.2C160.1 469 160 468.6 160 468.3C160 468 160 467.7 160.2 467.4C160.4 467.1 160.5 466.9 160.8 466.7C163.9 464.4 167 462 169.9 459.6C170.2 459.4 170.5 459.2 170.8 459.2C171.1 459.2 171.5 459.2 171.8 459.3C268 503.2 372.2 503.2 467.3 459.3C467.6 459.2 468 459.1 468.3 459.1C468.6 459.1 469 459.3 469.2 459.5C472.1 461.9 475.2 464.4 478.3 466.7C478.5 466.9 478.7 467.1 478.9 467.4C479.1 467.7 479.1 468 479.1 468.3C479.1 468.6 479 468.9 478.8 469.2C478.6 469.5 478.4 469.7 478.2 469.8C463.5 478.4 448.2 485.7 432.3 491.6C432.1 491.7 431.8 491.8 431.6 492C431.4 492.2 431.3 492.4 431.2 492.7C431.1 493 431.1 493.2 431.1 493.5C431.1 493.8 431.2 494 431.3 494.3C440.1 511.3 450.1 527.6 461.3 543.1C461.5 543.4 461.9 543.7 462.2 543.8C462.5 543.9 463 543.9 463.3 543.8C516.2 527.6 565.9 502.5 610.4 469.6C610.6 469.4 610.8 469.2 610.9 469C611 468.8 611.1 468.5 611.1 468.2C623.4 341.4 590.6 231.3 524.2 133.7zM222.5 401.5C193.5 401.5 169.7 374.9 169.7 342.3C169.7 309.7 193.1 283.1 222.5 283.1C252.2 283.1 275.8 309.9 275.3 342.3C275.3 375 251.9 401.5 222.5 401.5zM417.9 401.5C388.9 401.5 365.1 374.9 365.1 342.3C365.1 309.7 388.5 283.1 417.9 283.1C447.6 283.1 471.2 309.9 470.7 342.3C470.7 375 447.5 401.5 417.9 401.5z"/>
          </svg>
          <span>Continua con Discord</span>
        </a>
      </div>

      <div class="text-xs text-center text-gray-400 mt-4">
        <a routerLink="/privacy" class="hover:underline">Informativa sulla Privacy</a>
        ·
        <a routerLink="/terms-and-policies" class="hover:underline">Termini e Policy</a>
      </div>
      <p class="relative -top-2 text-[0.675rem] text-slate-600 dark:text-slate-300 text-center">
        Cliccando su <strong>Continua con Google / LinkedIn / GitHub / Discord</strong>,
        dichiari di aver letto e di accettare la
        <a class="a" routerLink="/privacy">Informativa sulla Privacy</a>,
        i <a class="a" routerLink="/terms-and-policies">Termini di Servizio</a>
        e la <a class="a" routerLink="/terms-and-policies" fragment="aup">Politica di Utilizzo Accettabile</a>.
      </p>
    </form>

  </main>
}
`
})
export class LoginPageComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder)
  private readonly themeManager = inject(ThemeManagerService)
  private readonly router = inject(Router)
  private readonly authService = inject(AuthService)
  private readonly fingerprintService = inject(FingerprintService)
  private readonly sessionSync = inject(SessionSyncService)
  private readonly userContext = inject(UserContextService)
  private readonly route = inject(ActivatedRoute)

  protected readonly uncorrectEmailMsg = "L'e-mail inserita non è corretta"

  private readonly redirectKey = 'redirectAfterLogin'
  private readonly loginKey = 'login'

  @ViewChild(TurnstileComponent)
  turnstileComponent!: TurnstileComponent

  protected loginForm: FormGroup<any>
  protected step = signal<1 | 2>(1)
  protected serverErrorStep = signal<0 | 1 | 2 | 2429>(0)

  protected loadingTurnstile = signal<boolean>(true)
  protected turnstileToken = signal<string | null>(null)
  protected loadingLogin = signal<boolean>(false)
  protected goingToPasswordStep = signal<boolean>(false)

  protected templateIsRendered = signal<boolean>(false)
  protected templateIsMounted = signal<boolean>(false)

  protected redirectTo = signal<string | null>(null)

  protected logoSrc = computed(() => {
    const { PICTOGRAM_LIGHT, PICTOGRAM_DARK } = environment.logoSrc
    return this.themeManager.theme() === 'light' ? PICTOGRAM_LIGHT : PICTOGRAM_DARK
  })

  private formStatus: Signal<FormControlStatus>
  private firstStepSubscription?: Subscription
  private secondStepSubscription?: Subscription
  private pollInterval?: ReturnType<typeof setInterval>

  private fingerprintDataEnc = ''
  private sessionDeviceInfo: SessionDeviceInfo = {
    osPlatform: '',
    useragent: '',
    browser: { name: '', version: '' }
  }

  constructor() {
    this.loginForm = this.fb.group({
      email: this.fb.control(null, [
        Validators.required,
        Validators.email,
        Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
      ]),
      password: this.fb.control(null, [Validators.required]),
      remember: this.fb.control(false)
    })

    this.formStatus = toSignal(this.loginForm.statusChanges, { initialValue: this.loginForm.status })

    effect(() => {
      this.templateIsMounted.set(!!this.templateIsRendered())
    })
  }

  private storageListener = (e: StorageEvent) => {
    if (e.key !== this.loginKey) return
    if (!e.newValue) return
    if (!this.router.url.startsWith('/login')) return

    this.userContext.setInitials(e.newValue ?? 'U')
    this.redirectAfterLogin()
  }

  canLogin = computed(() => {
    const hasToken = !!this.turnstileToken()
    const isValid = this.formStatus() === 'VALID'
    return hasToken && isValid
  })

  onTurnstileToken(token: string) {
    this.serverErrorStep.set(0)
    this.turnstileToken.set(token)
  }

  onTurnstileRender() {
    this.loadingTurnstile.set(false)
  }

  goToPasswordStep() {
    if (!this.loginForm.controls['email'].valid) return

    this.firstStepSubscription?.unsubscribe()
    this.firstStepSubscription = this.authService
      .login_stepZero({ email: this.loginForm.value['email'] })
      .pipe(tap(() => this.goingToPasswordStep.set(true)))
      .subscribe({
        next: () => {
          this.serverErrorStep.set(0)
          this.step.set(2)
          this.goingToPasswordStep.set(false)
        },
        error: err => {
          this.goingToPasswordStep.set(false)
          const body = err.error as HttpErrorBody
          if (body?.statusCode === 401) {
            this.serverErrorStep.set(1)
            return
          }
          localStorage?.setItem('lastHttpErr', btoa(JSON.stringify(body)))
          this.router.navigate(['/'])
        }
      })
  }

  onSubmit() {
    if (!this.loginForm.valid) return
    if (!this.turnstileToken()) return

    this.loadingLogin.set(true)
    localStorage.removeItem('scp')

    const dto: Login_FirstStepWrapper = {
      email: this.loginForm.value['email'],
      password: this.loginForm.value['password'],
      remember: this.loginForm.value['remember'],
      fingerprintBase64: this.fingerprintDataEnc,
      sessionDeviceInfo: this.sessionDeviceInfo,
      turnstileToken: this.turnstileToken()!
    }

    this.secondStepSubscription?.unsubscribe()
    this.secondStepSubscription = this.authService.login_firstStep(dto).subscribe({
      next: (res: Confirm_Login_FirstStepDTO) => {
        // ✅ redirect_to “indistruttibile”: queryParam OR sessionStorage fallback
        const redirectTo = this.getRedirectTo()
        const qp: any = {}
        if (redirectTo) qp.redirect_to = redirectTo

        if (res.needsMfa) {
          const { statusCode, timestamp, message, ...loginFirstStepData } = res
          sessionStorage?.setItem('preAuthorizationData', btoa(JSON.stringify(loginFirstStepData ?? '')))

          if (res.suspiciousAttempt) {
            this.router.navigate([`/login/mfa/EMAIL_OTP`], { queryParams: { ...qp, trust_verify: true } })
          } else if ((res.enabledMfaStrategies?.length ?? 0) === 1) {
            this.router.navigate([`/login/mfa/${res.enabledMfaStrategies[0]}`], { queryParams: qp })
          } else {
            this.router.navigate([`/login/mfa/CHOOSE_METHOD`], { queryParams: qp })
          }

          this.loadingLogin.set(false)
          return
        }

        this.authService.setAccessToken(res.accessToken ?? null)
        this.authService.setWs_accessToken(res.ws_accessToken ?? null)

        localStorage.setItem(this.loginKey, res.initials ?? 'U')
        this.sessionSync.resumeSession(res.initials ?? 'U')

        this.loadingLogin.set(false)
        this.redirectAfterLogin()
      },
      error: err => {
        const body = err.error as HttpErrorBody
        this.turnstileComponent?.reset()
        this.turnstileToken.set(null)
        this.loadingLogin.set(false)

        if (body?.statusCode === 401) {
          this.serverErrorStep.set(2)
          return
        }

        if (body?.statusCode === 429) {
          this.serverErrorStep.set(2429)
          return
        }

        sessionStorage?.setItem('lastHttpErr', btoa(JSON.stringify(body)))
        this.router.navigate(['/'])
      }
    })
  }

  private parseBool(raw: string | null) {
    if (!raw) return false
    try { return !!JSON.parse(raw) } catch { return false }
  }

  /** prende redirect_to da queryParam; se sparisce, fallback su sessionStorage */
  private getRedirectTo(): string | null {
    const v = this.route.snapshot.queryParamMap.get('redirect_to')
    if (v != null) {
      const s = String(v).trim()
      if (s.length) return s
    }
    const stored = sessionStorage.getItem(this.redirectKey)
    return stored?.trim()?.length ? stored.trim() : null
  }

  private storeRedirectIfMissing() {
    const qpRedirectTo = this.route.snapshot.queryParamMap.get('redirect_to')
    if (qpRedirectTo) {
      sessionStorage.setItem(this.redirectKey, String(qpRedirectTo))
      return
    }

    const existing = sessionStorage.getItem(this.redirectKey)
    if (existing) return

    const qpRedirect =
      this.route.snapshot.queryParamMap.get('redirect') ||
      this.route.snapshot.queryParamMap.get('returnUrl') ||
      this.route.snapshot.queryParamMap.get('r')

    if (qpRedirect) {
      sessionStorage.setItem(this.redirectKey, String(qpRedirect))
      return
    }

    const ref = document.referrer || ''
    const sameOrigin = ref.startsWith(window.location.origin)
    const looksLikeLogin = ref.includes('/login')

    if (sameOrigin && !looksLikeLogin) {
      try {
        const u = new URL(ref)
        const path = `${u.pathname}${u.search}${u.hash}`
        sessionStorage.setItem(this.redirectKey, path)
      } catch {
        // pass
      }
    }
  }

  private popRedirect() {
    const url = sessionStorage.getItem(this.redirectKey)
    if (url) sessionStorage.removeItem(this.redirectKey)
    return url
  }

  private redirectAfterLogin() {
    const redirectTo = this.getRedirectTo()
    if (redirectTo) {
      sessionStorage.removeItem(this.redirectKey)
      this.router.navigateByUrl(redirectTo)
      return
    }

    const redirect = this.popRedirect() || '/dashboard'
    this.router.navigateByUrl(redirect)
  }

  private startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval)

    this.pollInterval = setInterval(() => {
      if (document.hidden) return
      if (!this.router.url.startsWith('/login')) return

      const hasLogin = !!localStorage.getItem(this.loginKey)
      if (!hasLogin) return
      if (!this.userContext.isLoggedIn()) return

      this.redirectAfterLogin()
    }, 1500)
  }

  async ngOnInit() {

    const redirected = this.parseBool(this.route.snapshot.queryParamMap.get('redirected'))

    const redirectTo = this.route.snapshot.queryParamMap.get('redirect_to') ?? ''

    if (redirectTo) {
      this.redirectTo.set(redirectTo)
    }

    if (redirected) {
      queueMicrotask(() => this.cleanRedirectedQueryParam())
    }

    this.storeRedirectIfMissing()

    if (redirected) queueMicrotask(() => this.templateIsRendered.set(true))
    else this.templateIsRendered.set(true)

    window.addEventListener('storage', this.storageListener)
    this.startPolling()

    const { fingerprintDataEnc, sessionDeviceInfo } = await this.fingerprintService.getSanitizedFingerprint()
    this.fingerprintDataEnc = fingerprintDataEnc
    this.sessionDeviceInfo = sessionDeviceInfo

    this.loginForm.get('email')?.valueChanges.subscribe(() => {
      this.serverErrorStep.set(0)
      if (this.step() === 2) {
        this.step.set(1)
        this.loginForm.get('password')?.reset()
      }
    })

    this.loginForm.get('password')?.valueChanges.subscribe(() => {
      this.serverErrorStep.set(0)
    })
  }

  private cleanRedirectedQueryParam(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: { redirected: null },
      queryParamsHandling: 'merge'
    })
  }

  ngOnDestroy() {
    this.firstStepSubscription?.unsubscribe()
    this.secondStepSubscription?.unsubscribe()
    window.removeEventListener('storage', this.storageListener)
    if (this.pollInterval) clearInterval(this.pollInterval)
  }

  computeSsoLoginHref(provider: SSO_AuthProvider): string {
    const r = this.redirectTo()
    const queryString = r ? `?redirect_to=${encodeURIComponent(r)}` : ''
    return `/api/oauth2/sso/${provider}/login${queryString}`
  }

}
