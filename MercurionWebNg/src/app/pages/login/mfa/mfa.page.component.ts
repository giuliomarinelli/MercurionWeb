import { LoadingContextService } from '../../../services/context/loading-context.service';
import { NgClass } from '@angular/common';
import { Component, ElementRef, inject, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, debounceTime, distinctUntilChanged, EMPTY, filter, map, Subscription, switchMap, throwError } from 'rxjs';
import { Login_FirstStep_Data } from '../../../Models/confirm.models';
import { AuthService } from '../../../services/auth.service';
import { FingerprintService } from '../../../services/fingerprint.service';
import { HttpErrorRes } from '../../../Models/error-res.dto';
import { AuthRedirectService } from '../../../services/auth-redirect.service';
import { UserContextService } from '../../../services/context/user-context.service';
import { SessionSyncService } from '../../../services/session-sync.service';
import { ISessionDeviceInfo } from '../../../Models/auth/fingerprint.models';
import { TotpBodyDTO } from '../../../Models/auth/totp-body.dto';
import { ToastService } from '../../../services/toast.service';

export type MfaView = 'EMAIL_OTP' | 'SMS_OTP' | 'PH_V' | 'APP_TOTP' | ''

@Component({
  selector: 'app-mfa',
  imports: [ReactiveFormsModule, NgClass],
  template: `

    @if (canView()) {
      <div class="min-h-screen flex flex-col items-center justify-center px-4 py-8">

        <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-auto mb-6"
          viewBox="0 0 512 512"><!--!Font Awesome Pro 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path class="fill-current text-light-accent-primary/85 dark:text-slate-400"
            d="M63.8 384l50.1 0c9.3-33.5 14.1-68.2 14.1-103.1l0-24.9c0-31.1 11.1-59.7 29.6-81.9l-31.6-36.8C97.5 168.6 80 210.3 80 256l0 24.9c0 35-5.5 69.8-16.2 103.1zM163 106.6l31.7 37c18.2-9.9 39.1-15.6 61.3-15.6c70.7 0 128 57.3 128 128l0 24.9c0 34.6-2.8 69.1-8.4 103.1l48.6 0c5.2-34 7.8-68.5 7.8-103.1l0-24.9c0-97.2-78.8-176-176-176c-34.2 0-66 9.7-93 26.6zM190.3 480l51.4 0 2.6-6.7C267.9 411.9 280 346.7 280 280.9l0-24.9-48 0 0 24.9c0 59.9-11 119.3-32.5 175.2l-5.9 15.3-3.3 8.6z" />
          <path class="fill-current text-light-accent-secondary/70 dark:text-dark-accent-secondary/70"
            d="M48 256C48 141.1 141.1 48 256 48c63.1 0 119.6 28.1 157.8 72.5l15.6 18.2 36.4-31.3L450.2 89.2C403.3 34.6 333.7 0 256 0C114.6 0 0 114.6 0 256l0 40 0 24 48 0 0-24 0-40zm458.5-52.9l-4.9-23.5-47 9.9 4.9 23.5c2.9 13.9 4.5 28.3 4.5 43.1l0 40 0 24 48 0 0-24 0-40c0-18.1-1.9-35.8-5.5-52.9zM352 256c0-53-43-96-96-96s-96 43-96 96l0 24.9c0 46-7.6 91.6-22.5 135.1l46.3 0c13.4-43.7 20.3-89.2 20.3-135.1l0-24.9c0-28.7 23.3-52 52-52s52 23.3 52 52l0 24.9c0 45.6-5.5 91-16.4 135.1l45.2 0c10.1-44.2 15.2-89.5 15.2-135.1l0-24.9z" />
        </svg>

        <!-- Welcome Message -->
        <h1 class="text-2xl font-semibold text-gray-900 mb-8 dark:text-slate-100 text-center tracking-wider">Verifica la tua identità.</h1>


        <!-- Step-based Form -->
        <form class="w-full max-w-sm space-y-6">
          <!-- Step 1: Email -->
          @switch (true) {
          @case (['EMAIL_OTP', 'SMS_OTP', 'APP_TOTP'].includes(view())) {
          <p class="text-sm text-center relative bottom-2">@if (unTrusted() && view() === 'EMAIL_OTP') {
            <span class="tracking-wider text-light-warning dark:text-dark-warning font-semibold">
              Abbiamo rilevato un accesso insolito.
            </span>
              Perciò abbiamo
            } @else {
              Abbiamo
            }&nbsp;
            @switch (view()) {
              @case ('EMAIL_OTP') {
                <span>inviato una mail a&nbsp;</span>
                <span class="text-light-accent-primary dark:text-dark-accent-primary font-semibold">{{loginFirstStepData?.obscuredEmail ?? '*'}}</span>
              }
              @case ('SMS_OTP') {
                <span>inviato un SMS a&nbsp;</span>
                <span class="text-light-accent-primary dark:text-dark-accent-primary font-semibold">{{loginFirstStepData?.obscuredPhoneNumber ?? '*'}}</span>
              }
            }

          <span>&nbsp;con un codice di accesso</span></p>
          <div class="relative">
            <input #otp type="text" [formControl]="otpControl" id="otp"
              class="block py-4 px-4 w-full text-sm text-dark dark:text-light bg-transparent border-slate-300 border dark:border-slate-200 rounded-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-light-accent-primary dark:focus:ring-dark-accent-primary focus:border-light-accent-primary dark:focus:border-dark-accent-primary peer"
              placeholder=" " required (focus)="isOtpFocused.set(true)" (input)="serverError.set(false); onOtpInput()"
              (blur)="onOtpBlur()" />
            <label for="otp" [ngClass]="{
                'text-light-accent-secondary dark:text-dark-accent-secondary/90 scale-110 -translate-y-6 text-sm': isOtpFocused() || !isOtpEmpty(),
                'text-slate-400 text-lg scale-100 translate-y-0 cursor-text': !isOtpFocused() && isOtpEmpty()
              }"
              class="peer-focus:font-medium absolute transition-all duration-300 bg-light-surface-main dark:bg-neutral-950 px-1 top-[13px] left-4 origin-[0]"
              (click)="!isOtpFocused() && isOtpFocused.set(true); forceFocusOnOtp()">
              Codice monouso</label>
            <div class="text-sm text-light-error dark:text-dark-error mt-1 min-h-5">
              @if (otpControl.invalid && otpControl.touched && !serverError()) {
                @if (isOtpEmpty()) {
                  Il campo codice è vuoto.
                }
              } @else if (serverError()) {
                L'e-mail inserita non è corretta.
              }
            </div>
          </div>
          <button type="button" (click)="goTo('VERIFY_OTP_ACTION')" [disabled]="otpControl.invalid || loading()"
            class="relative bottom-[10px] w-full mt-4 py-2 text-white rounded-md transition-colors duration-150
          bg-light-accent-primary dark:bg-dark-accent-primary-btn
          hover:bg-dark-accent-primary/80 dark:hover:bg-dark-accent-primary/80
          disabled:bg-dark-accent-primary/80 disabled:dark:bg-dark-accent-primary/80
          disabled:cursor-not-allowed disabled:hover:bg-dark-accent-primary/80 disabled:hover:dark:bg-dark-accent-primary/80">
            Continua
          </button>
            }
          }

          <div class="relative py-2">
            <div class="absolute inset-0 flex items-center">
              <div class="w-full border-t"></div>
            </div>
            <div class="relative flex justify-center text-sm">
              <span class="bg-light-surface-main dark:bg-neutral-950 px-2 text-gray-500 dark:text-slate-300">OPPURE</span>
            </div>
          </div>

          <!-- Social buttons placeholder -->
          <div class="space-y-3 dark:text-slate-100">
            <button type="button"
              class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-auto fill-current"
                viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
                <path
                  d="M64 144a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L192 64zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zM64 464a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm48-208a48 48 0 1 0 -96 0 48 48 0 1 0 96 0z" />
              </svg>
              <span>Prova con un altro metodo</span>
            </button>
            <button type="button"
              class="w-full flex items-center justify-center border rounded-md py-2.5 text-sm dark:hover:bg-slate-100 gap-3 dark:hover:text-neutral-900 hover:bg-slate-200/80 bg-slate-200 dark:bg-transparent transition-colors duration-150">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" class="h-5 w-auto fill-current">
                <!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.-->
                <path
                  d="M544 248l0 3.3 69.7-69.7c21.9-21.9 21.9-57.3 0-79.2L535.6 24.4c-21.9-21.9-57.3-21.9-79.2 0L416.3 64.5c-2.7-.3-5.5-.5-8.3-.5L296 64c-37.1 0-67.6 28-71.6 64l-.4 0 0 120c0 22.1 17.9 40 40 40s40-17.9 40-40l0-72c0 0 0-.1 0-.1l0-15.9 16 0 136 0c0 0 0 0 .1 0l7.9 0c44.2 0 80 35.8 80 80l0 8zM336 192l0 56c0 39.8-32.2 72-72 72s-72-32.2-72-72l0-118.6c-35.9 6.2-65.8 32.3-76 68.2L99.5 255.2 26.3 328.4c-21.9 21.9-21.9 57.3 0 79.2l78.1 78.1c21.9 21.9 57.3 21.9 79.2 0l37.7-37.7c.9 0 1.8 .1 2.7 .1l160 0c26.5 0 48-21.5 48-48c0-5.6-1-11-2.7-16l2.7 0c26.5 0 48-21.5 48-48c0-12.8-5-24.4-13.2-33c25.7-5 45.1-27.6 45.2-54.8l0-.4c-.1-30.8-25.1-55.8-56-55.8c0 0 0 0 0 0l-120 0z" />
              </svg>
              <span>Richiedi assistenza</span>
            </button>
          </div>

          <div class="text-xs text-center text-gray-400 mt-4">
            <a href="#" class="hover:underline">Condizioni d'uso</a> · <a href="#" class="hover:underline">Informativa sulla
              privacy</a>
          </div>
        </form>
      </div>
    }

    `
})
export class MfaPageComponent implements OnInit, OnDestroy {

  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly fb = inject(FormBuilder)
  private readonly authService = inject(AuthService)
  private readonly fingerprintService = inject(FingerprintService)
  private readonly loadingContext = inject(LoadingContextService)
  private readonly redirect = inject(AuthRedirectService)
  private readonly sessionSyncService = inject(SessionSyncService)
  private readonly userContext = inject(UserContextService)
  private readonly toast = inject(ToastService)

  @ViewChild('otp')
  private otpRef!: ElementRef<HTMLInputElement>

  private paramsSub: Subscription | undefined
  private otpStateSub: Subscription | undefined
  private otpCallSub: Subscription | undefined
  private otpVerifySub: Subscription | undefined
  protected view = signal<MfaView>('')
  protected serverError = signal<boolean>(false)
  protected unTrusted = signal<boolean>(false)
  private viewList: string[] = ['EMAIL_OTP', 'SMS_OTP', 'PH_V', 'APP_TOTP', '']
  protected otpControl!: FormControl
  protected phoneControl!: FormControl
  protected isOtpFocused = signal<boolean>(false)
  protected isOtpEmpty = signal<boolean>(true)
  protected loading = signal<boolean>(false)
  protected canView = signal<boolean>(false)
  protected loginFirstStepData: Login_FirstStep_Data | null | undefined
  private fingerprintDataEnc: string = ''
  private sessionDeviceInfo: ISessionDeviceInfo = {
    osPlatform: '',
    useragent: '',
    browser: {
      name: '',
      version: ''
    }
  }
  private pollInterval!: ReturnType<typeof setInterval>



  private storageListener(e: StorageEvent) {
    if (e.key === 'login' && e.newValue) {
      if (this.router.url === '/login' || this.router.url.startsWith('/login')) {
        const redirect = sessionStorage.getItem('redirectAfterLogin') || '/profile'
        this.router.navigateByUrl(redirect)
        this.userContext.setInitials(e.newValue ?? 'U')
      }

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

    // 1. Fingerprint prima di tutto
    const { fingerprintDataEnc, sessionDeviceInfo } = await this.fingerprintService.getSanitizedFingerprint();
    this.fingerprintDataEnc = fingerprintDataEnc;
    this.sessionDeviceInfo = sessionDeviceInfo;

    // 2. Inizializzazione form controls
    this.otpControl = this.fb.control(null, [Validators.required]);
    this.phoneControl = this.fb.control(null, [Validators.required]);

    // 3. Validazione preAuthorizationData
    const raw = sessionStorage.getItem('preAuthorizationData')

    if (!raw) {
      await this.redirect.redirectToLogin('NotAllowed')
      return
    }

    try {
      this.loginFirstStepData = JSON.parse(atob(raw)) as Login_FirstStep_Data;
    } catch (e) {
      console.error('❌ Malformed preAuthorizationData', e)
      await this.redirect.redirectToLogin('NotAllowed')
      return
    }

    // 4. Watch OTP input
    this.otpStateSub = this.otpControl.valueChanges
      .pipe(
        filter(val => !!val),
        debounceTime(300),
        distinctUntilChanged(),
      )
      .subscribe(code => {
        if (code.length === 6) {
          this.loading.set(true)
          this.verifyOtp()
        }
      })

    // 5. Eliminazione eventuale accessToken rimasto in cache
    localStorage?.getItem('accessToken') && localStorage?.removeItem('accessToken')
    localStorage?.getItem('ws_accessToken') && localStorage?.removeItem('ws_accessToken')

    // 6. Gestione dei parametri della rotta (view e query)
    this.paramsSub = combineLatest([
      this.route.paramMap,
      this.route.queryParamMap
    ]).pipe(
      map(([params, query]) => {
        const view = params.get('view') as MfaView | null
        const trustVerify = (query.get('trust_verify') ?? 'false') === 'true'
        return { view, trustVerify }
      }),
      switchMap(({ view, trustVerify }) => {
        if (!view || !this.viewList.includes(view)) {
          this.toast.trigger('Si è verificato un errore', 'error', 3000)
          this.router.navigateByUrl('/login')
          return EMPTY
        }

        this.view.set(view)

        const mustVerify = view === 'EMAIL_OTP' && trustVerify
        this.unTrusted.set(mustVerify)

        if (!['EMAIL_OTP', 'SMS_OTP'].includes(view)) {
          return throwError(() => new Error('InvalidMethod'))
        }

        return this.authService.login_secondStep(
          view as 'EMAIL_OTP' | 'SMS_OTP',
          this.loginFirstStepData?.preAuthorizationToken ?? '',
          this.unTrusted()
        )
      })
    ).subscribe({
      next: () => {
        this.canView.set(true)
       },
      error: (e) => {
        if ('error' in e && 'status' in e && e.status === 429) {
          this.toast.trigger('Troppi tentativi, riprova tra qualche minuto.', 'error', 3000)
          this.router.navigateByUrl('/login')
          return
        }
        this.toast.trigger('Si è verificato un errore.', 'error', 3000)
        this.router.navigateByUrl('/login')
      }
    })


  }


  forceFocusOnOtp(): void {
    this.otpRef.nativeElement.focus()
  }


  goTo(target: MfaView | 'VERIFY_OTP_ACTION'): void {
    switch (target) {
      case 'VERIFY_OTP_ACTION':
        this.verifyOtp()
        break
    }
  }

  onOtpInput(): void {
    const value = this.otpRef?.nativeElement?.value ?? '';
    this.isOtpEmpty.set(value.trim() === '');
  }

  onOtpBlur(): void {
    const value = this.otpRef?.nativeElement?.value ?? '';
    this.isOtpEmpty.set(value.trim() === '');
    this.isOtpFocused.set(false)
  }

  verifyOtp(): void {
    if (['EMAIL_OTP', 'SMS_OTP', 'APP_TOTP'].includes(this.view())) {
      const totpDTO: TotpBodyDTO = {
        totp: this.otpControl.value
      }
      this.otpVerifySub = this.authService.login_thirdStep(
        this.view() as 'EMAIL_OTP' | 'SMS_OTP' | 'APP_TOTP',
        totpDTO,
        {
          fingerprintBase64: this.fingerprintDataEnc,
          sessionDeviceInfo: this.sessionDeviceInfo,
        },
        this.loginFirstStepData?.preAuthorizationToken ?? '',
        this.unTrusted()
      ).subscribe({
        next: res => {
          this.authService.setAccessToken(res.accessToken)
          this.authService.setWs_accessToken(res.ws_accessToken)
          if (sessionStorage.getItem('preAuthorizationData')) {
            sessionStorage.removeItem('preAuthorizationData')
          }
          this.authService.setAccessToken(res.accessToken ?? null)
          this.authService.setWs_accessToken(res.ws_accessToken ?? null)
          localStorage.setItem('login', res.initials ?? 'U')
          this.sessionSyncService.resumeSession(res.initials ?? 'U')
          const redirect = sessionStorage.getItem('redirectAfterLogin') || '/profile'
          this.router.navigateByUrl(redirect)
          this.loadingContext.stop()
        },
        error: (e) => {
          if (sessionStorage.getItem('preAuthorizationData')) {
            sessionStorage.removeItem('preAuthorizationData')
          }
          let message: string = 'Si è verificato un errore.'
          if ('error' in e && 'status' in e) {
            const errBody: HttpErrorRes = e.error
            if (e.status === 401) {
              switch (errBody.message) {
                case 'Invalid MFA strategy':
                case 'MfaDeviceMismatch':
                  message = 'Operazione non autorizzata.'
                  break
                case 'Invalid MFA OTP':
                  message = 'Il codice inserito non è corretto, devi ripetere il login.'
                  break
                default:
                  message = 'Si è verificato un errore.'
              }
            } else if (e.status === 429) {
              message = 'Troppi tentativi, riprova tra qualche minuto.'
            } else {
              message = 'Si è verificato un errore.'
            }
          }
          this.toast.trigger(message, 'error', 3000)
          this.router.navigateByUrl('/login')
        }
      })
    }
  }

  ngOnDestroy(): void {
    this.paramsSub?.unsubscribe()
    this.otpStateSub?.unsubscribe()
    this.otpCallSub?.unsubscribe()
    this.otpVerifySub?.unsubscribe()
    window.removeEventListener('storage', this.storageListener)
    clearInterval(this.pollInterval)
  }


}
