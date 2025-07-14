import { LoadingContextService } from '../../../services/context/loading-context.service';
import { NgClass } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, debounceTime, distinctUntilChanged, filter, map, Subscription } from 'rxjs';
import { Login_FirstStep_Data } from '../../../Models/confirm.dtos';
import { AuthService } from '../../../services/auth.service';
import { ISessionDeviceInfo } from '../../../Models/types/auth/DTO/fingerprint.dtos';
import { FingerprintService } from '../../../services/fingerprint.service';
import { TotpBodyDTO } from '../../../Models/types/auth/DTO/totp-body.dto';
import { HttpErrorRes } from '../../../Models/types/interfaces/error-res.dto';
import { AuthRedirectService } from '../../../services/auth-redirect.service';
import { UserContextService } from '../../../services/context/user-context.service';
import { SessionSyncService } from '../../../services/session-sync.service';

export type MfaView = 'EMAIL_OTP' | 'SMS_OTP' | 'PH_V' | 'APP_TOTP' | ''

@Component({
  selector: 'app-mfa',
  imports: [ReactiveFormsModule, NgClass],
  templateUrl: './mfa.component.html',
  styleUrl: './mfa.component.css'
})
export class MfaComponent implements OnInit, OnDestroy {

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

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly fb: FormBuilder,
    private readonly authService: AuthService,
    private readonly fingerprintService: FingerprintService,
    private readonly loadingContext: LoadingContextService,
    private readonly redirect: AuthRedirectService,
    private readonly sessionSyncService: SessionSyncService
  ) { }

  async ngOnInit(): Promise<void> {
    // 1. Fingerprint prima di tutto
    const { fingerprintDataEnc, sessionDeviceInfo } = await this.fingerprintService.getSanitizedFingerprint();
    this.fingerprintDataEnc = fingerprintDataEnc;
    this.sessionDeviceInfo = sessionDeviceInfo;

    // 2. Inizializzazione form controls
    this.otpControl = this.fb.control(null, [Validators.required, Validators.pattern(/\d{6}/)]);
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
          this.loading.set(true);
          this.verifyOtp();
        }
      })

    // 5. Eliminazione eventuale accessToken rimasto in cache
    localStorage?.getItem('accessToken') && localStorage?.removeItem('accessToken')

    // 6. Gestione dei parametri della rotta (view e query)
    this.paramsSub = combineLatest([
      this.route.paramMap,
      this.route.queryParamMap
    ])
      .pipe(
        map(([params, query]) => {
          const view = params.get('view') as MfaView | null
          const trustVerify = (query.get('trust_verify') ?? 'false') === 'true'
          return { view, trustVerify }
        })
      )
      .subscribe(async ({ view, trustVerify }) => {
        if (!view || !this.viewList.includes(view)) {
          await this.redirect.redirectToLogin('InvalidMfaView')
          return
        }

        this.loadingContext.stop()
        this.view.set(view)

        const mustVerify = view === 'EMAIL_OTP' && trustVerify
        this.unTrusted.set(mustVerify)

        if (['EMAIL_OTP', 'SMS_OTP'].includes(view)) {
          this.otpCallSub = this.authService.login_secondStep(
            this.view() as 'EMAIL_OTP' | 'SMS_OTP',
            this.loginFirstStepData?.preAuthorizationToken ?? '',
            this.unTrusted()
          ).subscribe({
            next: res => {
              console.log(res);
              this.loadingContext.stop()
            },
            error: err => {
              console.error(err.error)
              this.loadingContext.stop()
            }
          })
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
      this.otpVerifySub = this.authService.login_thirdStep(this.view() as 'EMAIL_OTP' | 'SMS_OTP' | 'APP_TOTP', totpDTO, {
        fingerprintBase64: this.fingerprintDataEnc,
        sessionDeviceInfo: this.sessionDeviceInfo,
      },
        this.loginFirstStepData?.preAuthorizationToken ?? '',
        this.unTrusted()).subscribe({
          next: res => {
            this.authService.setAccessToken(res.accessToken)
            this.authService.setWs_accessToken(res.ws_accessToken)
            if (sessionStorage.getItem('preAuthorizationData')) {
              sessionStorage?.removeItem('preAuthorizationData')
            }
            this.sessionSyncService.resumeSession(res.initials ?? 'U')
            const loginPath: string = atob(localStorage?.getItem('loginLastPath') || '') || '/profile'
            this.router.navigate([loginPath])
          },
          error: err => {
            const errBody: HttpErrorRes = err.error
            switch (errBody.statusCode) {
              case 400:
                console.error('Bad Request')
                break
              case 401:
                console.error('Unauthorized')
                break
              default:
                console.error('Error in server response')
            }
            sessionStorage?.setItem('mfaError', 'InvalidOtp')
            this.router.navigate(['/login'])
          }
        })
    }
  }

  ngOnDestroy(): void {
    this.paramsSub?.unsubscribe()
    this.otpStateSub?.unsubscribe()
    this.otpCallSub?.unsubscribe()
    this.otpVerifySub?.unsubscribe()
  }


}
