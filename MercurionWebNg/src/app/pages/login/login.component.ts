import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { ChangeDetectorRef, Component, computed, effect, ElementRef, OnDestroy, OnInit, Signal, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ThemeManagerService } from '../../services/stores/theme-manager.service';
import { PublicPipe } from '../../pipes/public.pipe';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';
import { HttpErrorRes } from '../../Models/types/interfaces/error-res.dto';
import { Login_FirstStepWrapper } from '../../Models/types/auth/DTO/login.dtos';
import { Confirm_Login_FirstStepDTO } from '../../Models/types/interfaces/confirm.responses';
import { NgClass } from '@angular/common';
import { FingerprintService } from '../../services/fingerprint.service';
import { ISessionDeviceInfo } from '../../Models/types/auth/DTO/fingerprint.dtos';
import { LoadingContextService } from '../../services/stores/loading-context.service';
import { ToastService } from '../../services/toast.service';
import { ToastContext } from '../../components/common/toast/toast.component';
import { UserContextService } from '../../services/stores/user-context.service';
import { TurnstileComponent } from '../../components/common/turnstile/turnstile.component';
import { PreviousRouteService } from '../../services/previous-route.service';
import { toSignal } from '@angular/core/rxjs-interop';


@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, PublicPipe, NgClass, TurnstileComponent, NgxSkeletonLoaderModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit, OnDestroy {

  @ViewChild('email')
  private emailRef!: ElementRef<HTMLInputElement>
  @ViewChild('password')
  private passwordRef!: ElementRef<HTMLInputElement>
  @ViewChild(TurnstileComponent)
  turnstileComponent!: TurnstileComponent

  protected loginForm!: FormGroup<any>
  protected logoSrc = computed(() =>
    this.themeManager.theme() === 'light' ? 'logo/pictogram-light-logo.svg' : 'logo/pictogram-dark-logo-2.svg'
  )

  protected step = signal<1 | 2>(1)
  protected serverErrorStep = signal<0 | 1 | 2>(0)
  protected emptyPassword = signal<boolean>(true)
  protected malformedEmail = signal<boolean>(false)
  protected isEmailFocused = signal<boolean>(false)
  protected emptyEmail = signal<boolean>(true)
  protected toastLevel = signal<ToastContext>('error')
  protected loadingTurnstile = signal<boolean>(true)
  protected resetTurnstile = signal<boolean>(false)
  protected turnstileToken = signal<string | null>(null)


  private firstStepSubscription: Subscription | undefined
  private secondStepSubscription: Subscription | undefined
  private emailStatusChangeSubscription: Subscription | undefined

  private fingerprintDataEnc: string = ''
  private sessionDeviceInfo: ISessionDeviceInfo = {
    osPlatform: '',
    useragent: '',
    browser: {
      name: '',
      version: ''
    }
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly themeManager: ThemeManagerService,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly fingerprintService: FingerprintService,
    private readonly loadingContext: LoadingContextService,
    private readonly toast: ToastService,
    private readonly userContext: UserContextService,
    private readonly previousRouteService: PreviousRouteService
  ) {
    this.loginForm = this.fb.group({
      email: this.fb.control(null, [Validators.required, Validators.email]),
      password: this.fb.control(null, [Validators.required])
    })
    this.passwordStatusSignal = toSignal(
      this.loginForm.controls['password'].statusChanges,
      { initialValue: this.loginForm.controls['password'].status }
    );
    this.passwordValueSignal = toSignal(
      this.loginForm.controls['password'].valueChanges,
      { initialValue: this.loginForm.controls['password'].value }
    )
  }

  passwordStatusSignal: Signal<string> = signal<'INVALID' | 'VALID' | 'PENDING' | 'DISABLED'>('INVALID')
  passwordValueSignal!: Signal<any>

  canLogin = computed(() =>
    !!this.turnstileToken() &&
    this.passwordStatusSignal() === 'VALID'
  )

  onTurnstileToken(token: string): void {
    this.serverErrorStep.set(0)
    this.turnstileToken.set(token)
    console.log('TOKEN CAMBIATO:', token);
    console.log('Password valid:', this.loginForm.controls['password'].valid);
    console.log('Form valid:', this.loginForm.valid);
  }

  onTurnstileRender(): void {
    console.log('render')
    this.loadingTurnstile.set(false)
  }

  onEmailEditStep2(): void {
    this.serverErrorStep.set(0)
    this.step.set(1)
    this.loadingTurnstile.set(true)
    this.loginForm.controls['password'].setValue(null)
    this.emptyPassword.set(true)
    this.onBlur('password')
  }


  onEmailInput(): void {
    const value = this.emailRef?.nativeElement?.value ?? '';
    this.emptyEmail.set(value.trim() === '');
  }

  onPasswordInput(): void {
    const value = this.passwordRef?.nativeElement?.value ?? '';
    this.emptyPassword.set(value.trim() === '');
    console.log('Password input:', value, 'Valid:', this.loginForm.controls['password'].valid, 'Token:', this.turnstileToken);
  }

  onBlur(field: 'email' | 'password'): void {
    if (field === 'email') {
      this.isEmailFocused.set(false)
      this.onEmailInput()
    } else if (field === 'password') {
      this.loginForm.controls['password'].markAsDirty()
      this.loginForm.controls['password'].markAsUntouched()
    }
  }

  async ngOnInit(): Promise<void> {
    this.router.navigateByUrl(
      !this.previousRouteService.getPreviousUrl()?.startsWith('/login')
        && this.previousRouteService.getPreviousUrl()
        ? this.previousRouteService.getPreviousUrl() as string
        : '/profile'
    );

    if (sessionStorage?.getItem('mfaError') === 'InvalidOtp') {
      this.toast.trigger('Codice monouso errato. Ritenta.')
      sessionStorage?.removeItem('mfaError')
    }
    if (sessionStorage?.getItem('logout') === 'success') {
      this.toast.trigger('Logout avvenuto con successo!', 'success')
      sessionStorage?.removeItem('logout')
    } else if (sessionStorage?.getItem('logout') === '403') {
      this.toast.trigger('Dispositivo non riconosciuto. Accesso negato!')
      sessionStorage?.removeItem('logout')
    }
    if (sessionStorage?.getItem('MfaError') === 'NotAllowed') {
      this.toast.trigger('Accesso negato!')
      sessionStorage?.removeItem('MfaError')
    }
    // if (sessionStorage?.getItem('RouteError')) {
    //   this.toast.trigger('Accesso negato!')
    //   sessionStorage?.removeItem('RouteError')
    // }
    const login = sessionStorage?.getItem('login')
    if (login != null && (login.length === 1 || login.length === 2)) {
      this.router.navigate([sessionStorage?.getItem('loginLastPath') || '/profile'])
    }

    this.emailStatusChangeSubscription = this.loginForm.controls['email'].statusChanges.subscribe(() => {
      const control = this.loginForm.controls['email']
      // this.emptyEmail.set(control.errors?.['required'] ?? false)
      this.malformedEmail.set(control.errors?.['email'] ?? false)
    })
    const { fingerprintDataEnc, sessionDeviceInfo } = await this.fingerprintService.getSanitizedFingerprint()
    this.fingerprintDataEnc = fingerprintDataEnc
    this.sessionDeviceInfo = sessionDeviceInfo

  }

  protected isFocus(field: 'email' | 'password'): boolean {
    if (field === 'email') {
      return this.emailRef?.nativeElement.matches(':focus')
    } else if (field === 'password') {
      return this.passwordRef?.nativeElement.matches(':focus')
    }
    return false
  }

  goToPasswordStep(): void {
    if (this.loginForm.controls['email'].valid) {
      this.firstStepSubscription = this.authService.login_stepZero({ email: this.loginForm.value['email'] }).subscribe({
        next: () => {
          this.step.set(2)
        },
        error: err => {
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
    if (this.loginForm.valid && this.turnstileToken) {
      console.log('onSubmit')
      this.loadingContext.start()
      const dto: Login_FirstStepWrapper = {
        email: this.loginForm.value['email'],
        password: this.loginForm.value['password'],
        remember: false,
        fingerprintBase64: this.fingerprintDataEnc,
        sessionDeviceInfo: this.sessionDeviceInfo,
        turnstileToken: this.turnstileToken() as string
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
            this.userContext.login(res.initials)
            this.authService.setAccessToken(res.accessToken as string)
            localStorage?.setItem('login', res.initials ?? 'U')
            this.userContext.setInitials(res.initials ?? 'U')
            const loginPath: string = atob(sessionStorage.getItem('loginLastPath') || '') || '/profile'
            this.router.navigate([loginPath])
          }
        },
        error: err => {
          const body = err.error as HttpErrorRes
          console.error(body)
          if (body.statusCode === 400) {
            // handle bad request
          } else if (body.statusCode === 401) {
            this.serverErrorStep.set(2)
            this.turnstileComponent.reset();
            this.turnstileToken.set(null)
            this.loadingContext.stop()
          } else {
            sessionStorage?.setItem('lastHttpErr', btoa(JSON.stringify(body)))
            this.router.navigate(['/'])
          }
        }
      })
    }
  }

  ngOnDestroy(): void {
    this.firstStepSubscription?.unsubscribe()
    this.secondStepSubscription?.unsubscribe()
    this.emailStatusChangeSubscription?.unsubscribe()
  }



}
