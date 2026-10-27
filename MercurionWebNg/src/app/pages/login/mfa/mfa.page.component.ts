import { NgZone } from '@angular/core'
import { injectBrowserResourceOwner } from '../../../utils/browser-resource-owner.util'
import {
  OtpChallengeClockComponent,
  otpDeadlineFromResponse,
} from '../../../components/common/otp-challenge-clock/otp-challenge-clock.component'
import { ButtonPendingContentComponent } from '../../../components/common/button/button-pending-content.component'
import {
  Component,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ChangeDetectionStrategy,
  viewChild,
  computed,
} from '@angular/core'
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import {
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  EMPTY,
  filter,
  map,
  Subscription,
  switchMap,
} from 'rxjs'
import type { PersistedPreAuthState } from '../../../Models/auth/pre-auth.models'
import { FingerprintService } from '../../../services/fingerprint.service'
import { AuthStateStore } from '../../../services/auth-state.store'
import { AuthSessionPersistenceService } from '../../../services/auth-session-persistence.service'
import { SessionSyncService } from '../../../services/session-sync.service'
import type { SessionDeviceInfo } from '@mercurion/rest-contracts'
import { ToastService } from '../../../services/toast.service'
import { ProgressIndicatorComponent } from '../../../components/common/progress-indicator/progress-indicator.component'
import { HttpErrorResponse } from '@angular/common/http'
import { MfaStrategy, MfaView } from '../../../Models/account/account.models'
import { MfaStrategyCardComponent } from '../../../components/common/mfa-strategy-card/mfa-strategy-card.component'
import { DesignService } from '../../../services/design.service'
import { AuthRedirectService } from '../../../services/auth-redirect.service'
import { AuthErrorService } from '../../../services/auth-error.service'
import { MfaFlowState, MfaStrategyRegistry, MfaStrategySession } from './mfa-flow.strategy'

@Component({
  selector: 'm-mfa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonPendingContentComponent,
    ReactiveFormsModule,
    ProgressIndicatorComponent,
    MfaStrategyCardComponent,
    RouterLink,
    OtpChallengeClockComponent
],
  template: `
    @if (canView()) {
      <main class="auth-page" aria-labelledby="mfa-title">
        <section class="auth-card">
          <header class="auth-header">

        <!-- icona ... (uguale a prima) -->
        <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
          viewBox="0 0 512 512">
          <path class="fill-current text-light-accent-primary-hc dark:text-slate-400"
            d="M63.8 384l50.1 0c9.3-33.5 14.1-68.2 14.1-103.1l0-24.9c0-31.1 11.1-59.7 29.6-81.9l-31.6-36.8C97.5 168.6 80 210.3 80 256l0 24.9c0 35-5.5 69.8-16.2 103.1zM163 106.6l31.7 37c18.2-9.9 39.1-15.6 61.3-15.6c70.7 0 128 57.3 128 128l0 24.9c0 34.6-2.8 69.1-8.4 103.1l48.6 0c5.2-34 7.8-68.5 7.8-103.1l0-24.9c0-97.2-78.8-176-176-176c-34.2 0-66 9.7-93 26.6zM190.3 480l51.4 0 2.6-6.7C267.9 411.9 280 346.7 280 280.9l0-24.9-48 0 0 24.9c0 59.9-11 119.3-32.5 175.2l-5.9 15.3-3.3 8.6z" />
          <path class="fill-current text-light-accent-secondary/70 dark:text-dark-accent-secondary/70"
            d="M48 256C48 141.1 141.1 48 256 48c63.1 0 119.6 28.1 157.8 72.5l15.6 18.2 36.4-31.3L450.2 89.2C403.3 34.6 333.7 0 256 0C114.6 0 0 114.6 0 256l0 40 0 24 48 0 0-24 0-40zm458.5-52.9l-4.9-23.5-47 9.9 4.9 23.5c2.9 13.9 4.5 28.3 4.5 43.1l0 40 0 24 48 0 0-24 0-40c0-18.1-1.9-35.8-5.5-52.9zM352 256c0-53-43-96-96-96s-96 43-96 96l0 24.9c0 46-7.6 91.6-22.5 135.1l46.3 0c13.4-43.7 20.3-89.2 20.3-135.1l0-24.9c0-28.7 23.3-52 52-52s52 23.3 52 52l0 24.9c0 45.6-5.5 91-16.4 135.1l45.2 0c10.1-44.2 15.2-89.5 15.2-135.1l0-24.9z" />
        </svg>

        <h1 id="mfa-title" class="auth-title">
          Verifica la tua identità.
        </h1>
          </header>

        <form class="auth-form" (submit)="$event.preventDefault(); verifyCode()" aria-labelledby="mfa-title" [attr.aria-busy]="loading()">

          @switch (true) {

            @case (view() === 'CHOOSE_METHOD') {
              <p class="auth-description">
                Scegli un metodo di autenticazione a più fattori:
              </p>

              <div class="grid gap-3">
                @for (s of enabledMfaStrategies(); track s) {
                  <button
                    type="button"
                    class="w-full rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-primary"
                    (click)="goToFromStrategy(s)"
                  >
                    <m-mfa-strategy-card
                      [activeStrategies]="enabledMfaStrategies()"
                      [strategy]="s"
                      [choose]="true"
                    />
                  </button>
                }
              </div>
            }

            @case (['EMAIL_OTP', 'SMS_OTP', 'APP_TOTP', 'BACKUP_CODE'].includes(view())) {

              <p class="auth-description">
                @if (unTrusted() && view() === 'EMAIL_OTP') {
                  <span class="tracking-wider text-light-warning dark:text-dark-warning font-semibold">
                    Abbiamo rilevato un accesso insolito.
                  </span>
                  Perciò abbiamo
                } @else if (['EMAIL_OTP', 'SMS_OTP'].includes(view())) {
                  Abbiamo
                }&nbsp;

                @switch (view()) {
                  @case ('EMAIL_OTP') {
                    <span>inviato una mail a&nbsp;</span>
                    <span class="text-light-accent-primary-hc dark:text-dark-accent-primary font-semibold">
                      {{loginFirstStepData?.obscuredEmail ?? '*'}}
                    </span>
                  }
                  @case ('SMS_OTP') {
                    <span>inviato un SMS a&nbsp;</span>
                    <span class="text-light-accent-primary-hc dark:text-dark-accent-primary font-semibold">
                      {{loginFirstStepData?.obscuredPhoneNumber ?? '*'}}
                    </span>
                  }
                  @case ('APP_TOTP') {
                    <span>Apri la tua app di autenticazione e inserisci il codice generato</span>
                  }
                  @case ('BACKUP_CODE') {
                    <span>Inserisci un codice di backup</span>
                  }
                }
                @if (['EMAIL_OTP', 'SMS_OTP'].includes(view())) {
                  <span>&nbsp;con un codice di accesso</span>
                }
              </p>

              <div class="auth-code">
                <label for="otp">{{ view() === 'BACKUP_CODE' ? 'Codice di backup' : 'Codice monouso' }}</label>
                <input #otp type="text" [formControl]="codeControl" id="otp"
                  autocomplete="one-time-code" [attr.inputmode]="view() === 'BACKUP_CODE' ? 'text' : 'numeric'"
                  aria-describedby="mfa-code-error" [attr.aria-invalid]="serverError() || codeControl.invalid && codeControl.touched ? 'true' : null"
                  required
                  (focus)="isOtpFocused.set(true)"
                  (input)="serverError.set(null); onOtpInput()"
                  (blur)="onOtpBlur()" />

                <div id="mfa-code-error" class="auth-code-error" role="status" aria-live="polite">
                  @if (codeControl.invalid && codeControl.touched && !serverError()) {
                    @if (isOtpEmpty()) {
                      Il campo codice è vuoto.
                    }
                  } @else if (serverError()) {
                    {{ serverError() }}
                  }
                </div>
              </div>

              @if (view() === 'EMAIL_OTP' || view() === 'SMS_OTP') {
                <m-otp-challenge-clock [deadline]="otpDeadline()" [resendAvailable]="false" />
              }

              <button
                type="submit"
                aria-label="Verifica"
                [disabled]="codeControl.invalid || loading() || state().kind === 'initializing'"
                [attr.aria-busy]="loading()"
                class="mfa-submit"
              >
                <m-button-pending-content [pending]="loading()">Verifica</m-button-pending-content>
              </button>

            }
          }

          <!-- resto del template sotto (OPPURE, help, ecc.) identico al tuo -->
          <div class="auth-separator"><span>Hai bisogno di aiuto?</span></div>

          <div class="space-y-3 dark:text-slate-100">
            @if (!unTrusted() && !(view() === 'CHOOSE_METHOD')) {
              <button type="button"
                class="auth-option"
                (click)="goTo('CHOOSE_METHOD')">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-auto fill-current"
                  viewBox="0 0 512 512">
                  <path d="M64 144a48 48 0 1 0 0-96 48 48 0 1 0 0 96zM192 64c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L192 64zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zm0 160c-17.7 0-32 14.3-32 32s14.3 32 32 32l288 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-288 0zM64 464a48 48 0 1 0 0-96 48 48 0 1 0 0 96zm48-208a48 48 0 1 0 -96 0 48 48 0 1 0 96 0z" />
                </svg>
                <span>Prova con un altro metodo</span>
              </button>
            }
            <a href="mailto:mercurion.app@gmail.com"
              class="auth-option">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512" class="h-5 w-auto fill-current">
                <path d="M544 248l0 3.3 69.7-69.7c21.9-21.9 21.9-57.3 0-79.2L535.6 24.4c-21.9-21.9-57.3-21.9-79.2 0L416.3 64.5c-2.7-.3-5.5-.5-8.3-.5L296 64c-37.1 0-67.6 28-71.6 64l-.4 0 0 120c0 22.1 17.9 40 40 40s40-17.9 40-40l0-72c0 0 0-.1 0-.1l0-15.9 16 0 136 0c0 0 0 0 .1 0l7.9 0c44.2 0 80 35.8 80 80l0 8zM336 192l0 56c0 39.8-32.2 72-72 72s-72-32.2-72-72l0-118.6c-35.9 6.2-65.8 32.3-76 68.2L99.5 255.2 26.3 328.4c-21.9 21.9-21.9 57.3 0 79.2l78.1 78.1c21.9 21.9 57.3 21.9 79.2 0l37.7-37.7c.9 0 1.8 .1 2.7 .1l160 0c26.5 0 48-21.5 48-48c0-5.6-1-11-2.7-16l2.7 0c26.5 0 48-21.5 48-48c0-12.8-5-24.4-13.2-33c25.7-5 45.1-27.6 45.2-54.8l0-.4c-.1-30.8-25.1-55.8-56-55.8c0 0 0 0 0 0l-120 0z" />
              </svg>
              <span>Richiedi assistenza</span>
            </a>
          </div>

          <div class="auth-links">
            <a routerLink="/privacy" class="auth-link">Informativa sulla privacy</a>
             ·
            <a routerLink="/terms-and-policies" class="auth-link">Termini e Policy</a>
          </div>
        </form>
        </section>
      </main>
    } @else {
      <main class="auth-page auth-page--pending" aria-label="Preparazione della verifica">
        <m-progress-indicator />
      </main>
    }
  `,
  styleUrls: ['../auth-entry.css', './mfa.page.component.css']
})
export class MfaPageComponent implements OnInit, OnDestroy {
  private readonly persistence = inject(AuthSessionPersistenceService)
  private readonly redirects = inject(AuthRedirectService)
  private readonly authErrors = inject(AuthErrorService)
  private readonly strategyRegistry = inject(MfaStrategyRegistry)

  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly fb = inject(FormBuilder)
  private readonly fingerprintService = inject(FingerprintService)
  private readonly sessionSyncService = inject(SessionSyncService)
  private readonly authState = inject(AuthStateStore)
  private readonly toast = inject(ToastService)
  protected readonly design = inject(DesignService)

  private readonly resources = injectBrowserResourceOwner()
  private readonly zone = inject(NgZone)
  private destroyed = false
  private terminated = false
  protected readonly otpDeadline = signal<number | null>(null)

  private readonly otpRef = viewChild.required<ElementRef<HTMLInputElement>>('otp')

  private paramsSub?: Subscription
  private otpStateSub?: Subscription
  private otpVerifySub?: Subscription
  private strategySession?: MfaStrategySession

  protected view = signal<MfaView>('')
  protected serverError = signal<string | null>(null)
  protected unTrusted = signal<boolean>(false)

  private readonly viewList: MfaView[] = [
    'EMAIL_OTP',
    'SMS_OTP',
    'APP_TOTP',
    'BACKUP_CODE',
    'CHOOSE_METHOD',
    '',
  ]

  protected enabledMfaStrategies = signal<MfaStrategy[]>([])
  protected codeControl: FormControl<string> = new FormControl('', { nonNullable: true })
  protected phoneControl: FormControl<string> = new FormControl('', { nonNullable: true })
  protected isOtpFocused = signal<boolean>(false)
  protected isOtpEmpty = signal<boolean>(true)
  protected canView = signal<boolean>(false)
  protected state = signal<MfaFlowState>({ kind: 'initializing' })
  protected readonly loading = computed(
    () => this.state().kind === 'submitting' || this.state().kind === 'completed'
  )

  protected loginFirstStepData: PersistedPreAuthState | null | undefined

  private fingerprintDataEnc = ''
  private sessionDeviceInfo: SessionDeviceInfo = {
    osPlatform: '',
    useragent: '',
    browser: { name: '', version: '' },
  }

  private pollInterval: ReturnType<typeof setInterval> | undefined

  private resolveRedirectTarget(): string {
    return this.redirects.consume()
  }

  private gotoLoginPreservingRedirect(): void {
    this.router.navigate(['/login'])
  }

  async ngOnInit(): Promise<void> {
    const { fingerprintDataEnc, sessionDeviceInfo } =
      await this.fingerprintService.getSanitizedFingerprint()
    if (this.destroyed) return
    this.fingerprintDataEnc = fingerprintDataEnc
    this.sessionDeviceInfo = sessionDeviceInfo

    this.codeControl = this.fb.nonNullable.control('', [Validators.required])
    this.phoneControl = this.fb.nonNullable.control('', [Validators.required])

    const preAuth = this.persistence.readPreAuthState()
    if (preAuth.status !== 'valid') {
      this.state.set({ kind: 'terminal-invalid', reason: preAuth.status })
      this.endPreAuthentication(preAuth.status === 'expired' ? 'expired' : 'invalid')
      return
    }
    this.loginFirstStepData = preAuth.state
    this.authState.enterPreAuthentication(preAuth.state.preAuthorizationToken)
    this.zone.runOutsideAngular(() => {
      this.pollInterval = this.resources.setInterval(() => {
        if (this.authState.authenticated()) {
          this.zone.run(() => this.router.navigateByUrl(this.resolveRedirectTarget()))
        } else if (!this.isPreAuthCurrent()) {
          this.zone.run(() => this.endPreAuthentication('expired'))
        }
      }, 1000)
    })
    this.resources.addEventListener(document, 'visibilitychange', () => {
      if (!document.hidden && !this.authState.authenticated()) this.ensurePreAuthentication()
    })

    this.paramsSub = combineLatest([this.route.paramMap, this.route.queryParamMap])
      .pipe(
        map(([params, query]) => {
          const view = params.get('view') as MfaView | null
          const trustVerify = (query.get('trust_verify') ?? 'false') === 'true'
          return { view, trustVerify }
        }),
        distinctUntilChanged(
          (previous, current) =>
            previous.view === current.view && previous.trustVerify === current.trustVerify
        ),
        switchMap(({ view, trustVerify }) => {
          if (!this.ensurePreAuthentication()) return EMPTY
          this.otpDeadline.set(null)
          this.redirects.captureQueryParam(this.route.snapshot.queryParamMap.get('redirect_to'))
          if (!view || !this.viewList.includes(view)) {
            this.state.set({ kind: 'terminal-invalid', reason: 'unsupported' })
            this.router.navigateByUrl('/403-forbidden')
            return EMPTY
          }
          this.view.set(view)
          this.strategySession?.cancel()
          this.otpStateSub?.unsubscribe()
          this.otpVerifySub?.unsubscribe()
          this.codeControl.reset('', { emitEvent: false })
          this.isOtpEmpty.set(true)
          this.isOtpFocused.set(false)
          this.serverError.set(null)
          if (view === 'CHOOSE_METHOD') {
            this.enabledMfaStrategies.set(preAuth.state.enabledMfaStrategies)
            this.state.set({
              kind: 'challenge-ready',
              strategy: preAuth.state.enabledMfaStrategies[0],
            })

            this.canView.set(true)
            return EMPTY
          }
          const strategy = this.strategyRegistry.create(view, {
            preAuth: preAuth.state,
            fingerprintBase64: this.fingerprintDataEnc,
            sessionDeviceInfo: this.sessionDeviceInfo,
            trustVerify: view === 'EMAIL_OTP' && trustVerify,
          })
          if (!strategy) {
            this.state.set({ kind: 'terminal-invalid', reason: 'unsupported' })
            this.router.navigateByUrl('/403-forbidden')
            return EMPTY
          }
          this.strategySession = strategy
          this.unTrusted.set(view === 'EMAIL_OTP' && trustVerify)
          this.state.set({ kind: 'initializing', strategy: strategy.strategy })
          this.otpStateSub = this.codeControl.valueChanges
            .pipe(
              filter((value) => value.length === strategy.codeLength),
              debounceTime(300),
              distinctUntilChanged()
            )
            .subscribe(() => this.verifyCode())
          return strategy.initialize()
        })
      )
      .subscribe({
        next: (metadata) => {
          if (!this.ensurePreAuthentication()) return
          this.otpDeadline.set(metadata ? otpDeadlineFromResponse(metadata) : null)
          const strategy = this.strategySession
          if (strategy) this.state.set({ kind: 'challenge-ready', strategy: strategy.strategy })

          this.canView.set(true)
        },
        error: (e) => {
          if ('error' in e && 'status' in e) {
            const he = e as HttpErrorResponse
            if (he.status === 429) {
              this.authErrors.setFromHttp(he, 'mfa')
              this.endPreAuthentication(
                'cancelled',
                'Troppi tentativi, riprova tra qualche minuto.'
              )
              return
            }
            // Challenge initialization does not check a code: 401 rejects preauthorization.
            if (he.status === 401) {
              this.endPreAuthentication('invalid')
              return
            }
          }
          const strategy = this.strategySession
          if (strategy) {
            this.state.set({
              kind: 'recoverable-error',
              strategy: strategy.strategy,
              message: 'Non è stato possibile preparare la verifica.',
            })
          }

          this.canView.set(true)
        },
      })
  }

  // ---- UI helpers

  forceFocusOnOtp(): void {
    this.otpRef().nativeElement.focus()
  }

  onOtpInput(): void {
    const value = this.otpRef()?.nativeElement?.value ?? ''
    this.isOtpEmpty.set(value.trim() === '')
  }

  onOtpBlur(): void {
    const value = this.otpRef()?.nativeElement?.value ?? ''
    this.isOtpEmpty.set(value.trim() === '')
    this.isOtpFocused.set(false)
  }

  // ---- NAVIGATION

  private strategyToView(strategy: MfaStrategy): MfaView {
    // Se i tuoi valori MfaStrategy sono diversi,
    // cambia qui e basta.
    switch (strategy as unknown as string) {
      case 'EMAIL_OTP':
        return 'EMAIL_OTP'
      case 'SMS_OTP':
        return 'SMS_OTP'
      case 'APP_TOTP':
        return 'APP_TOTP'
      case 'BACKUP_CODE':
        return 'BACKUP_CODE'
      default:
        return 'CHOOSE_METHOD'
    }
  }

  goToFromStrategy(strategy: MfaStrategy): void {
    const v = this.strategyToView(strategy)
    this.goTo(v)
  }

  goTo(target: MfaView): void {
    if (!this.viewList.includes(target) || !this.ensurePreAuthentication()) return

    const qp: Record<string, boolean> = {}

    // preserva trust_verify solo se stiamo andando su EMAIL_OTP
    const trust = this.route.snapshot.queryParamMap.get('trust_verify') === 'true'
    if (trust && target === 'EMAIL_OTP') qp['trust_verify'] = true

    this.router.navigate([`/login/mfa/${target}`], { queryParams: qp })
  }

  // ---- VERIFY

  verifyCode(): void {
    if (!this.ensurePreAuthentication()) return
    const strategy = this.strategySession
    if (
      !strategy ||
      this.codeControl.invalid ||
      !this.codeControl.value.trim() ||
      !['challenge-ready', 'recoverable-error'].includes(this.state().kind)
    ) {
      return
    }
    const code =
      strategy.strategy === 'BACKUP_CODE'
        ? { code: this.codeControl.value.trim() }
        : { totp: this.codeControl.value.trim() }
    this.state.set({ kind: 'submitting', strategy: strategy.strategy })
    this.serverError.set(null)

    this.otpVerifySub = strategy.submit(code).subscribe({
      next: (res) => {
        if (this.destroyed || this.terminated) return
        this.resources.clearInterval(this.pollInterval)
        this.authErrors.clear()
        this.authState.activateAuthenticatedSession({
          initials: res.initials ?? 'U',
          accessToken: res.accessToken,
          wsAccessToken: res.ws_accessToken,
        })
        this.persistence.consumePreAuthState()
        this.sessionSyncService.resumeSession(res.initials ?? 'U')
        this.state.set({ kind: 'completed', strategy: strategy.strategy })
        this.router.navigateByUrl(this.resolveRedirectTarget())
      },
      error: (e) => {
        const authError = this.authErrors.setFromHttp(e, 'mfa')
        if (
          authError &&
          ['mfa-expired', 'mfa-device-mismatch', 'mfa-code-invalid', 'rate-limited'].includes(
            authError.category
          )
        ) {
          // Nest consumes the token before checking an OTP or backup code.
          this.endPreAuthentication(
            authError.category === 'mfa-expired' ? 'expired' : 'invalid',
            `${authError.message ?? 'La verifica non è più valida.'} Devi ripetere l'accesso.`
          )
          return
        }
        this.state.set({
          kind: 'recoverable-error',
          strategy: strategy.strategy,
          message: authError?.message ?? 'Si è verificato un errore.',
        })
        this.serverError.set(
          authError?.message ?? 'Non è stato possibile verificare il codice. Riprova.'
        )
        this.toast.trigger(authError?.message ?? 'Si è verificato un errore.', 'error', 3000)
        this.authErrors.consume()
      },
    })
  }

  private isPreAuthCurrent(): boolean {
    const current = this.persistence.readPreAuthState()
    return (
      current.status === 'valid' &&
      current.state.preAuthorizationToken === this.loginFirstStepData?.preAuthorizationToken
    )
  }

  private ensurePreAuthentication(): boolean {
    if (this.destroyed || this.terminated || this.state().kind === 'completed') return false
    if (this.isPreAuthCurrent()) return true
    this.endPreAuthentication('expired')
    return false
  }

  private endPreAuthentication(
    reason: 'expired' | 'invalid' | 'cancelled',
    message = "La verifica è scaduta o non è più valida. Ripeti l'accesso."
  ): void {
    if (this.destroyed || this.terminated || this.authState.authenticated()) return
    this.terminated = true
    this.state.set({ kind: 'terminal-invalid', reason })
    this.resources.clearInterval(this.pollInterval)
    this.strategySession?.cancel()
    this.otpStateSub?.unsubscribe()
    this.otpVerifySub?.unsubscribe()
    this.codeControl.reset('', { emitEvent: false })
    this.otpDeadline.set(null)
    this.loginFirstStepData = null
    this.canView.set(false)
    this.authState.cancelPreAuthentication()
    this.toast.trigger(message, 'error', 5000)
    this.gotoLoginPreservingRedirect()
  }

  ngOnDestroy(): void {
    this.destroyed = true
    this.strategySession?.cancel()
    this.paramsSub?.unsubscribe()
    this.otpStateSub?.unsubscribe()
    this.otpVerifySub?.unsubscribe()
    this.resources.clearInterval(this.pollInterval)
  }
}
