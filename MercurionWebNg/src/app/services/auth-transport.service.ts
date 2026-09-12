import { Injectable, inject } from '@angular/core'
import { HttpClient } from '@angular/common/http'
import { Observable } from 'rxjs'
import type {
  BackupCodeDTO,
  ConfirmDTO,
  ConfirmWithAccessTokenAndInitialsDTO,
  ConfirmWithObsContDTO,
  ConfirmWithTotpMetaDTO,
  Confirm_Login_FirstStepDTO,
  EmailDTO,
  Login_FirstStepDTO,
  MaintenanceBypassResponse,
  MfaStrategy,
  SessionDeviceInfo,
  SignedSessionIdDTO,
  SSO_AuthProvider,
  TotpBodyDTO,
  UserRegisterDTO,
  VerifyBodyDTO
} from '@mercurion/rest-contracts'
import type { Login_FirstStepWrapper } from '../Models/auth/login.models'

/** Owns authentication protocol calls and nothing else. */
@Injectable({ providedIn: 'root' })
export class AuthTransportService {
  private readonly http = inject(HttpClient)

  registerUser(dto: UserRegisterDTO, turnstileToken: string): Observable<ConfirmWithObsContDTO> {
    return this.http.post<ConfirmWithObsContDTO>('/api/account/register', dto, {
      withCredentials: true,
      headers: { 'X-Challenge-Token': turnstileToken }
    })
  }

  isUserAvailableByEmail(email: string): Observable<boolean> {
    return this.http.post<boolean>('/api/account/is-email-available', { email } satisfies EmailDTO, {
      withCredentials: true
    })
  }

  loginStepZero(email: EmailDTO): Observable<ConfirmDTO> {
    return this.http.post<ConfirmDTO>('/api/authentication/login/0', email, { withCredentials: true })
  }

  loginFirstStep(wrapper: Login_FirstStepWrapper): Observable<Confirm_Login_FirstStepDTO> {
    const { fingerprintBase64, sessionDeviceInfo, turnstileToken, ...loginRequest } = wrapper
    return this.http.post<Confirm_Login_FirstStepDTO>('/api/authentication/login/1', loginRequest as Login_FirstStepDTO, {
      withCredentials: true,
      headers: {
        'X-Fingerprint': fingerprintBase64,
        'X-Device-Info': btoa(JSON.stringify(sessionDeviceInfo)),
        'X-Challenge-Token': turnstileToken
      }
    })
  }

  loginSecondStep(
    strategy: 'EMAIL_OTP' | 'SMS_OTP',
    preAuthorizationToken: string,
    trustVerify = false
  ): Observable<ConfirmWithTotpMetaDTO> {
    const query = trustVerify ? `?trust_verify=${trustVerify}` : ''
    return this.http.post<ConfirmWithTotpMetaDTO>(`/api/authentication/login/${strategy}/2${query}`, null, {
      withCredentials: true,
      headers: { Authorization: `Bearer ${preAuthorizationToken}` }
    })
  }

  loginThirdStep(
    strategy: MfaStrategy,
    dto: TotpBodyDTO | BackupCodeDTO,
    fingerprintData: { fingerprintBase64: string; sessionDeviceInfo: SessionDeviceInfo },
    preauthorizationToken: string,
    trustVerify = false
  ): Observable<ConfirmWithAccessTokenAndInitialsDTO> {
    const body: VerifyBodyDTO = { kind: strategy !== 'BACKUP_CODE' ? 'totp' : 'backup', payload: dto }
    const query = trustVerify ? `?trust_verify=${trustVerify}` : ''
    return this.http.post<ConfirmWithAccessTokenAndInitialsDTO>(
      `/api/authentication/login/${strategy}/3${query}`,
      body,
      {
        withCredentials: true,
        headers: {
          'X-Fingerprint': fingerprintData.fingerprintBase64,
          'X-Device-Info': btoa(JSON.stringify(fingerprintData.sessionDeviceInfo)),
          Authorization: `Bearer ${preauthorizationToken}`
        }
      }
    )
  }

  logout(): Observable<void> {
    return this.http.delete<void>('/api/authentication/logout', { withCredentials: true })
  }

  refreshWsAccessToken(): Observable<string> {
    return this.http.get('/api/authentication/ws-refresh', {
      withCredentials: true,
      responseType: 'text'
    })
  }

  logoutFromSession(signedSessionId: string): Observable<ConfirmDTO> {
    const body: SignedSessionIdDTO = { signedSessionId }
    return this.http.patch<ConfirmDTO>('/api/authentication/logout-from-session', body, { withCredentials: true })
  }

  logoutFromAllSessions(): Observable<ConfirmDTO> {
    return this.http.patch<ConfirmDTO>('/api/authentication/logout-from-all-sessions', null, { withCredentials: true })
  }

  ssoAuthorizeFlow(
    fingerprintBase64: string,
    sessionDeviceInfoBase64: string,
    preAuthorizationToken: string,
    provider: SSO_AuthProvider
  ): Observable<ConfirmWithAccessTokenAndInitialsDTO> {
    return this.http.post<ConfirmWithAccessTokenAndInitialsDTO>(
      `/api/authentication/sso/${provider}/authorize-flow`,
      null,
      {
        withCredentials: true,
        headers: {
          'X-Fingerprint': fingerprintBase64,
          'X-Device-Info': sessionDeviceInfoBase64,
          Authorization: `Bearer ${preAuthorizationToken}`
        }
      }
    )
  }

  skipMaintenanceMode(token: string): Observable<MaintenanceBypassResponse> {
    return this.http.get<MaintenanceBypassResponse>(`/api/admin/maintenance?t=${token}`, { withCredentials: true })
  }
}
