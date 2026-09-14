import { Injectable, inject } from '@angular/core'
import { Router } from '@angular/router'
import { HttpErrorResponse } from '@angular/common/http'
import { EMPTY, Observable, Subject, catchError, defer, filter, map, takeUntil, tap, throwError } from 'rxjs'
import type { Confirm_Login_FirstStepDTO, EmailDTO } from '@mercurion/rest-contracts'
import { AuthTransportService } from './auth-transport.service'
import { AuthSessionRepository } from './auth-session-repository.service'
import { AuthStateStore } from './auth-state.store'
import { AuthSessionPersistenceService } from './auth-session-persistence.service'
import { AuthErrorService } from './auth-error.service'
import { AuthRedirectService } from './auth-redirect.service'
import { FingerprintService } from './fingerprint.service'
import { SessionSyncService } from './session-sync.service'
import type { LoginCredentials, LoginDeviceContext, LoginFlowResult } from '../pages/login/login-flow.models'

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly auth = inject(AuthTransportService)
  private readonly sessions = inject(AuthSessionRepository)
  private readonly authState = inject(AuthStateStore)
  private readonly persistence = inject(AuthSessionPersistenceService)
  private readonly authErrors = inject(AuthErrorService)
  private readonly redirects = inject(AuthRedirectService)
  private readonly fingerprint = inject(FingerprintService)
  private readonly sessionSync = inject(SessionSyncService)
  private readonly router = inject(Router)
  private readonly cancelled = new Subject<void>()
  private attempt = 0
  private device?: LoginDeviceContext

  prepareLogin(): Observable<LoginDeviceContext> {
    return defer(() => this.fingerprint.getSanitizedFingerprint()).pipe(
      map(({ fingerprintDataEnc, sessionDeviceInfo }) => {
        this.device = { fingerprintBase64: fingerprintDataEnc, sessionDeviceInfo }
        return this.device
      })
    )
  }

  checkEmail(email: string): Observable<void> {
    const request: EmailDTO = { email }
    return this.auth.loginStepZero(request).pipe(
      tap(() => this.authErrors.clear()),
      map(() => undefined)
    )
  }

  login(credentials: LoginCredentials): Observable<LoginFlowResult> {
    const currentAttempt = ++this.attempt
    this.authErrors.beginAttempt()
    this.authState.beginAuthentication('password')
    const device = this.device
    if (!device) return throwError(() => new Error('LoginDeviceNotReady'))

    const request = {
      email: credentials.email,
      password: credentials.password,
      remember: credentials.remember,
      fingerprintBase64: device.fingerprintBase64,
      sessionDeviceInfo: device.sessionDeviceInfo,
      turnstileToken: credentials.turnstileToken
    }

    return this.auth.loginFirstStep(request).pipe(
      takeUntil(this.cancelled),
      filter(() => currentAttempt === this.attempt),
      tap((response) => {
        this.completeOrHandoff(response)
      }),
      map(response => this.toResult(response)),
      catchError(error => {
        if (currentAttempt !== this.attempt) return EMPTY
        this.authErrors.setFromHttp(error, 'login')
        return throwError(() => error)
      })
    )
  }

  cancelLogin(): void {
    this.attempt++
    this.cancelled.next()
  }

  selectSso(provider: string, redirectTo: string | null): void {
    const target = redirectTo ?? this.redirects.peek()
    const query = target ? `?redirect_to=${encodeURIComponent(target)}` : ''
    window.location.assign(`/api/oauth2/sso/${provider}/login${query}`)
  }

  consumeRedirect(): string {
    return this.redirects.consume()
  }

  captureRedirect(value: string | null): void {
    if (value != null) this.redirects.captureQueryParam(value)
  }

  private completeOrHandoff(response: Confirm_Login_FirstStepDTO): void {
    if (response.needsMfa) {
      const { statusCode, timestamp, message, ...preAuth } = response
      if (!this.sessions.savePreAuthState(preAuth)) {
        this.authState.beginAuthentication('password')
        void this.router.navigate(['/login'])
        return
      }
      if (!response.preAuthorizationToken) {
        this.sessions.invalidate()
        return
      }
      this.sessions.enterPreAuthentication(response.preAuthorizationToken)
      const target = response.suspiciousAttempt
        ? ['/login/mfa/EMAIL_OTP']
        : (response.enabledMfaStrategies?.length ?? 0) === 1
          ? [`/login/mfa/${response.enabledMfaStrategies[0]}`]
          : ['/login/mfa/CHOOSE_METHOD']
      void this.router.navigate(target, response.suspiciousAttempt ? { queryParams: { trust_verify: true } } : undefined)
      return
    }

    if (!response.accessToken || !response.ws_accessToken) {
      this.authState.invalidate()
      return
    }
    this.sessions.activate({
      initials: response.initials ?? 'U',
      accessToken: response.accessToken,
      wsAccessToken: response.ws_accessToken
    })
    this.sessionSync.resumeSession(response.initials ?? 'U')
    void this.router.navigateByUrl(this.consumeRedirect())
  }

  private toResult(response: Confirm_Login_FirstStepDTO): LoginFlowResult {
    return response.needsMfa
      ? { kind: 'mfa', response }
      : { kind: 'authenticated', initials: response.initials ?? 'U' }
  }
}
