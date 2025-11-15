import { Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, Signal, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormControlStatus, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeManagerService } from '../../services/context/theme-manager.service';
import { PublicPipe } from '../../pipes/public.pipe';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription, tap } from 'rxjs';
import { HttpErrorRes } from '../../Models/error-res.dto';
import { Confirm_Login_FirstStepDTO } from '../../Models/confirm.models';
import { FingerprintService } from '../../services/fingerprint.service';
import { ToastContext } from '../../components/common/toast/toast.component';
import { UserContextService } from '../../services/context/user-context.service';
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component';
import { SessionSyncService } from '../../services/session-sync.service';
import { FloatingInputComponent } from '../../components/common/floating-input/floating-input.component';
import { ClassicSpinnerComponent } from '../../components/common/classic-spinner/classic-spinner.component';
import { ISessionDeviceInfo } from '../../Models/auth/fingerprint.models';
import { Login_FirstStepWrapper } from '../../Models/auth/login.models';
import { environment } from '../../../environments/environment.development';
import { toSignal } from '@angular/core/rxjs-interop';




@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    PublicPipe,
    TurnstileComponent,
    FloatingInputComponent,
    RouterLink,
    ClassicSpinnerComponent
  ],
  template: `

    <!-- login-placeholder-mercurion.component.html -->
    <div class="min-h-screen flex flex-col items-center px-4 pt-9">
      <!-- Logo -->
      <img
        [src]="logoSrc() | public"
        alt="Mercurion Logo"
        class="w-16 h-auto mb-6"
      />

      <!-- Welcome Message -->
      <h1
        class="text-2xl font-semibold text-gray-900 mb-8 tracking-wider dark:text-slate-100 text-center"
      >
        Piacere di averti qui.
      </h1>

      <!-- Step-based Form -->
      <form
        [formGroup]="loginForm"
        (ngSubmit)="onSubmit()"
        class="w-full max-w-sm space-y-6"
      >
        <!-- Step 1: Email -->

        @if (step() === 1) {
          <!-- STEP 1: EMAIL -->
          <div class="mt-2">
            <app-floating-input
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
            >
            </app-floating-input>
          </div>
          <button
            type="button"
            (click)="goToPasswordStep()"
            [disabled]="loginForm.controls['email'].invalid"
            class="relative bottom-[10px] w-full mt-1 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary/80 dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
          >
            Continua
          </button>
        } @else if (step() === 2) {
          <!-- STEP 2: EMAIL + PASSWORD (email ancora editabile) -->
          <div class="relative mb-3 mt-2">
            <app-floating-input
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
            >
            </app-floating-input>
          </div>
          <div class="relative">
            <app-floating-input
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
            >
            </app-floating-input>

            <button
              type="submit"
              [disabled]="!canLogin() || loadingLogin()"
              class="relative bottom-[2px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150 bg-light-accent-primary dark:bg-dark-accent-primary-btn hover:bg-light-accent-primary/80 dark:hover:bg-dark-accent-primary/80 disabled:bg-light-accent-primary/60 disabled:dark:bg-dark-accent-primary/80 disabled:cursor-not-allowed disabled:hover:bg-light-accent-primary/60 disabled:hover:dark:bg-dark-accent-primary/80"
            >
              @if (!loadingLogin()) {
                Accedi
              } @else {
                <div class="text-slate-200 flex items-center justify-center">
                  <app-classic-spinner [size]="24"></app-classic-spinner>
                </div>
              }
            </button>
          </div>
          <div class="flex justify-center">
            @if (loadingTurnstile()) {
              <div
                class="w-[300px] h-[71px] overflow-hidden transition-all bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 animate-pulse skeleton-pulse"
              >
                <span class="sr-only">Loading CAPTCHA…</span>
              </div>
            }
            <app-turnstile
              (token)="onTurnstileToken($event)"
              (widgetReady)="onTurnstileRender()"
              (refresh)="loadingTurnstile.set(true)"
              class="block h-[71px] mt-1"
            />
          </div>
        }

        <!-- Register & Social Login Placeholder -->
        <div
          class="my-3 text-sm flex gap-3 justify-between items-center flex-col 2xs:flex-row"
        >
          <a
            routerLink="/forgot-password"
            class="text-light-accent-primary dark:text-dark-accent-primary hover:underline"
            >Password dimenticata?</a
          >
          <a
            routerLink="/register"
            class="text-light-accent-primary dark:text-dark-accent-primary hover:underline"
            >Registrati</a
          >
        </div>
        <div
          class="text-sm text-center text-gray-600 dark:text-gray-300 flex items-center justify-center gap-3"
        >
          <label
            class="group relative inline-flex w-11 shrink-0 rounded-full bg-gray-200 p-0.5 inset-ring inset-ring-gray-900/5 outline-offset-2 outline-dark-accent-primary transition-colors duration-200 ease-in-out has-[:checked]:bg-dark-accent-primary has-[:focus-visible]:outline-2 dark:bg-neutral-800 dark:inset-ring-white/10 dark:outline-dark-accent-primary/60 dark:has-[:checked]:bg-acceoutline-dark-accent-primary/60"
          >
            <input
              type="checkbox"
              formControlName="remember"
              name="setting"
              aria-label="Use setting"
              class="absolute inset-0 appearance-none cursor-pointer focus:outline-hidden"
            />
            <span
              class="size-5 rounded-full bg-white shadow-xs ring-1 ring-gray-900/5 transition-transform duration-200 ease-in-out group-has-[:checked]:translate-x-5"
            ></span>
          </label>

          <p class="text-sm">Ricordami per 30 giorni</p>
        </div>

        <div class="relative py-2">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t"></div>
          </div>
          <div class="relative flex justify-center text-sm">
            <span
              class="bg-light-surface-main dark:bg-neutral-950 px-2 text-gray-500 dark:text-slate-300"
              >OPPURE</span
            >
          </div>
        </div>

        <!-- Social buttons placeholder -->
        <div class="space-y-3 dark:text-slate-100">
          <button
            type="button"
            class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-auto"
              viewBox="0 0 488 512"
            >
              <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
              <path
                class="fill-current"
                d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"
              />
            </svg>
            <span>Continua con Google</span>
          </button>
          <button
            type="button"
            class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-auto fill-current"
              viewBox="0 0 448 512"
            >
              <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
              <path
                d="M0 32h214.6v214.6H0V32zm233.4 0H448v214.6H233.4V32zM0 265.4h214.6V480H0V265.4zm233.4 0H448V480H233.4V265.4z"
              />
            </svg>
            <span>Continua con Microsoft</span>
          </button>
          <button
            type="button"
            class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-auto fill-current"
              viewBox="0 0 384 512"
            >
              <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
              <path
                d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
              />
            </svg>
            <span>Continua con Apple</span>
          </button>
          <button
            type="button"
            class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-5 w-auto fill-current"
              viewBox="0 0 512 512"
            >
              <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
              <path
                d="M512 256C512 114.6 397.4 0 256 0S0 114.6 0 256C0 376 82.7 476.8 194.2 504.5V334.2H141.4V256h52.8V222.3c0-87.1 39.4-127.5 125-127.5c16.2 0 44.2 3.2 55.7 6.4V172c-6-.6-16.5-1-29.6-1c-42 0-58.2 15.9-58.2 57.2V256h83.6l-14.4 78.2H287V510.1C413.8 494.8 512 386.9 512 256h0z"
              />
            </svg>
            <span>Continua con Facebook</span>
          </button>
        </div>

        <div class="text-xs text-center text-gray-400 mt-4">
          <a href="#" class="hover:underline">Condizioni d'uso</a> ·
          <a href="#" class="hover:underline">Informativa sulla privacy</a>
        </div>
      </form>
    </div>


  `
})
export class LoginPageComponent implements OnInit, OnDestroy {

  // ======================= DEPS =======================
  private readonly fb = inject(FormBuilder)
  private readonly themeManager = inject(ThemeManagerService)
  private readonly router = inject(Router)
  private readonly authService = inject(AuthService)
  private readonly fingerprintService = inject(FingerprintService)
  private readonly sessionSync = inject(SessionSyncService)
  private readonly userContext = inject(UserContextService)
  // ====================================================

  protected readonly uncorrectEmailMsg = 'L\'e-mail inserita non è corretta'

  @ViewChild(TurnstileComponent)
  turnstileComponent!: TurnstileComponent

  protected loginForm!: FormGroup<any>
  protected logoSrc = computed(() => {
    const { PICTOGRAM_LIKE, PICTOGRAM_DARK } = environment.logoSrc
    return this.themeManager.theme() === 'light' ? PICTOGRAM_LIKE : PICTOGRAM_DARK
  })

  protected step = signal<1 | 2>(1)
  protected serverErrorStep = signal<0 | 1 | 2 | 2429>(0)
  protected malformedEmail = signal<boolean>(false)
  protected toastLevel = signal<ToastContext>('error')
  protected loadingTurnstile = signal<boolean>(true)
  protected resetTurnstile = signal<boolean>(false)
  protected turnstileToken = signal<string | null>(null)
  protected loadingLogin = signal<boolean>(false)
  protected goingToPasswordStep = signal<boolean>(false)

  private formStatus!: Signal<FormControlStatus>



  private firstStepSubscription?: Subscription
  private secondStepSubscription?: Subscription
  private emailSub?: Subscription
  private pswSub?: Subscription
  private pollInterval!: ReturnType<typeof setInterval>

  private fingerprintDataEnc: string = ''
  private sessionDeviceInfo: ISessionDeviceInfo = {
    osPlatform: '',
    useragent: '',
    browser: {
      name: '',
      version: ''
    }
  }

  constructor() {
    this.loginForm = this.fb.group({
      email: this.fb.control(null, [Validators.required, Validators.email, Validators.pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)]),
      password: this.fb.control(null, [Validators.required]),
      remember: this.fb.control(false)
    })
    this.formStatus = toSignal(this.loginForm.statusChanges, {
      initialValue: this.loginForm.status,
    })
  }

  private storageListener(e: StorageEvent) {
    if (e.key === 'login' && e.newValue) {
      if (this.router.url === '/login' || this.router.url.startsWith('/login')) {
        const redirect = sessionStorage.getItem('redirectAfterLogin') || '/profile'
        this.router.navigateByUrl(redirect)
        this.userContext.setInitials(e.newValue ?? 'U')
      }

    }
  }

  canLogin = computed(() => {
    const hasToken = !!this.turnstileToken()
    const isValid = this.formStatus() === 'VALID'
    return hasToken && isValid
  })
  onTurnstileToken(token: string): void {
    this.serverErrorStep.set(0)
    this.turnstileToken.set(token)
  }

  onTurnstileRender(): void {
    console.log('render')
    this.loadingTurnstile.set(false)
  }

  goToPasswordStep(): void {
    if (this.loginForm.controls['email'].valid) {
      this.firstStepSubscription = this.authService.login_stepZero({ email: this.loginForm.value['email'] }).pipe(
        tap(() => this.goingToPasswordStep.set(true))
      ).subscribe({
        next: () => {
          this.serverErrorStep.set(0)
          this.step.set(2)
          this.goingToPasswordStep.set(false)
        },
        error: err => {
          this.goingToPasswordStep.set(false)
          this.serverErrorStep.set(1)
          console.error(err.error)
          const body = err.error as HttpErrorRes
          if (body.statusCode === 400) {
            // handle bad request
          } else if (body.statusCode === 401) {
            this.serverErrorStep.set(1)
          } else {
            localStorage?.setItem('lastHttpErr', btoa(JSON.stringify(body)))
            this.router.navigate(['/'])
          }
        }
      })
    }
  }

  onSubmit(): void {
    if (this.loginForm.valid && this.turnstileToken()) {
      this.loadingLogin.set(true)
      const dto: Login_FirstStepWrapper = {
        email: this.loginForm.value['email'],
        password: this.loginForm.value['password'],
        remember: this.loginForm.value['remember'],
        fingerprintBase64: this.fingerprintDataEnc,
        sessionDeviceInfo: this.sessionDeviceInfo,
        turnstileToken: this.turnstileToken()!
      }
      this.secondStepSubscription = this.authService.login_firstStep(dto).subscribe({
        next: (res: Confirm_Login_FirstStepDTO) => {
          if (res.needsMfa) {
            const { statusCode, timestamp, message, ...loginFirstStepData } = res
            sessionStorage?.setItem('preAuthorizationData', btoa(JSON.stringify(loginFirstStepData)))
            if (res.suspiciousAttempt) {
              this.router.navigate([`/login/mfa/EMAIL_OTP`], {
                queryParams: {
                  'trust_verify': true
                }
              })
            } else if (res.enabledMfaStrategies.length === 1) {
              this.router.navigate([`/login/mfa/${res.enabledMfaStrategies[0]}`])
            } else {
              this.router.navigate(['/login/mfa/choose-method'])
            }
          } else {
            this.authService.setAccessToken(res.accessToken ?? null)
            this.authService.setWs_accessToken(res.ws_accessToken ?? null)
            localStorage.setItem('login', res.initials ?? 'U')
            this.sessionSync.resumeSession(res.initials ?? 'U')
            const redirect = sessionStorage.getItem('redirectAfterLogin') || '/profile'
            this.router.navigateByUrl(redirect)
            this.loadingLogin.set(false)
          }
        },
        error: err => {
          const body = err.error as HttpErrorRes
          this.turnstileComponent.reset();
          this.turnstileToken.set(null)
          this.loadingLogin.set(false)
          if (body.statusCode === 400) {
            // handle bad request if necessary
          } else if (body.statusCode === 401) {
            this.serverErrorStep.set(2)
          } else if (body.statusCode === 429) {
            this.serverErrorStep.set(2429)
          } else {
            sessionStorage?.setItem('lastHttpErr', btoa(JSON.stringify(body)))
            this.router.navigate(['/'])
          }
        }
      })
    }
  }

  async ngOnInit(): Promise<void> {
    window.addEventListener('storage', this.storageListener)
    this.pollInterval = setInterval(() => {
      if (localStorage.getItem('login') && (this.router.url === '/login' || this.router.url.startsWith('/login'))) {
        const redirect = sessionStorage.getItem('redirectAfterLogin') || '/profile';
        this.router.navigateByUrl(redirect);
      }
    }, 1000)

    const { fingerprintDataEnc, sessionDeviceInfo } = await this.fingerprintService.getSanitizedFingerprint()
    this.fingerprintDataEnc = fingerprintDataEnc
    this.sessionDeviceInfo = sessionDeviceInfo
    this.emailSub = this.loginForm.get('email')?.valueChanges.subscribe(() => {
      this.serverErrorStep.set(0)
      if (this.step() === 2) {
        this.step.set(1);
        this.loginForm.get('password')?.reset();
      }
    });
    this.pswSub = this.loginForm.get('password')?.valueChanges.subscribe(() => this.serverErrorStep.set(0))

  }

  ngOnDestroy(): void {
    this.firstStepSubscription?.unsubscribe()
    this.secondStepSubscription?.unsubscribe()
    this.emailSub?.unsubscribe()
    this.pswSub?.unsubscribe()
    window.removeEventListener('storage', this.storageListener)
    clearInterval(this.pollInterval)
  }



}
