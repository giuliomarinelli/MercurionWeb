import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { TypeGuardsService } from './type-guards.service';
import type {
  AuthProvider,
  BackupCodesDTO,
  BackupCodeStatusDTO,
  ChangePasswordDTO,
  ChangePhoneDTO,
  ConfirmChangeDTO,
  ConfirmDTO,
  ConfirmMfaChange,
  ConfirmWithObsContDTO,
  ConfirmWithPhoneMfaFeedback,
  ConfirmWithRecoveryCodeDTO,
  EmailDTO,
  MfaStrategy,
  ProfileDTO,
  ProfileRegistryClientDTO,
  ProfileRegistryDTO,
  ProvidedEmailDTO,
  SessionDTO,
  TotpDTO,
  VersionDTO
} from '@mercurion/rest-contracts'


@Injectable({
  providedIn: 'root'
})
export class AccountService {

  private readonly http = inject(HttpClient)
  private readonly typeGuards = inject(TypeGuardsService)

  private cachedProvidedEmail = signal<ProvidedEmailDTO | null>(null)

  private getCachedProvidedEmail(): ProvidedEmailDTO | null {
    const cached = this.cachedProvidedEmail()
    if (!cached) {
      return null
    }
    return cached
  }

  private setCachedProvidedEmail(dto: ProvidedEmailDTO): void {
    if (!dto) {
      return
    }
    this.cachedProvidedEmail.set(dto)
  }

  public getProvidedEmail(refetch = false): Observable<ProvidedEmailDTO> {
    const cached = this.getCachedProvidedEmail()
    if (cached && !refetch) {
      return of(cached)
    } else {
      return this.http.get<ProvidedEmailDTO>('/api/account/email', {
        withCredentials: true
      }).pipe(
        tap(dto => this.setCachedProvidedEmail(dto))
      )
    }
  }

  public getAuthProvider(): Observable<AuthProvider> {
    return this.http.get('/api/account/auth-provider', {
      withCredentials: true,
      responseType: 'text'
    }).pipe(
      switchMap((p) => {
        if (this.typeGuards.is_SSO_AuthProvider(p)) {
          return of(p as AuthProvider)
        }
        return throwError(() => new Error('invalid_provider'))
      })
    )
  }

  public sendForgottenPasswordLink(dto: EmailDTO, turnstileToken: string): Observable<ConfirmWithObsContDTO> {
    return this.http.post<ConfirmWithObsContDTO>('/api/account/forgotten-password', dto, {
      withCredentials: true,
      headers: {
        'X-Challenge-Token': turnstileToken
      }
    })
  }

  public isAuthorizedToRecoverPassword(changePasswordToken: string): Observable<boolean> {
    return this.http.get<boolean>('/api/account/is-authorized-to-recover-password', {
      withCredentials: true,
      headers: {
        'Authorization': `Bearer ${changePasswordToken}`
      }
    })
  }

  public recoverPassword(dto: ChangePasswordDTO, changePasswordToken: string): Observable<ConfirmDTO> {
    return this.http.patch<ConfirmDTO>('/api/account/password-recovery', dto, {
      withCredentials: true,
      headers: {
        'Authorization': `Bearer ${changePasswordToken}`
      }
    })
  }

  public changePassword(dto: ChangePasswordDTO): Observable<ConfirmDTO> {
    return this.http.patch<ConfirmDTO>('/api/account/password', dto, {
      withCredentials: true
    })
  }

  public activateAccount(token: string): Observable<ConfirmWithRecoveryCodeDTO> {
    return this.http.patch<ConfirmWithRecoveryCodeDTO>(`/api/account/activate?t=${token}`, null, {
      withCredentials: true
    })
  }

  public getProfileRegistry(getRecentHistory = true): Observable<ProfileDTO> {
    const query = getRecentHistory ? '' : '?get_recent_history=false'
    return this.http.get<ProfileDTO>(`/api/account/profile-registry${query}`, {
      withCredentials: true
    })
  }

  public getEssentialProfileRegistry(): Observable<ProfileRegistryClientDTO> {
    return this.http.get<ProfileRegistryClientDTO>('/api/account/profile-registry/essential', {
      withCredentials: true
    })
  }

  public updateProfileRegistry(dto: ProfileRegistryDTO): Observable<ProfileRegistryClientDTO> {
    return this.http.patch<ProfileRegistryClientDTO>('/api/account/profile-registry', dto, {
      withCredentials: true
    })
  }

  public isMfaEnabled(): Observable<boolean> {
    return this.http.get<boolean>('/api/account/is-mfa-enabled', {
      withCredentials: true
    })
  }

  public getEnabledMfaStrategies(preauth = false): Observable<MfaStrategy[]> {
    return this.http.get<MfaStrategy[]>('/api/account/mfa-active-strategies', {
      withCredentials: true
    })
  }

  public getActiveSessions(): Observable<SessionDTO[]> {
    return this.http.get<SessionDTO[]>('/api/account/active-sessions', {
      withCredentials: true
    })
  }

  public getCurrentVersion(): Observable<VersionDTO> {
    return this.http.get<VersionDTO>('/api/account/current-version', {
      withCredentials: true
    })
  }

  public getMaskedEmail(): Observable<string> {
    return this.http.get('/api/account/masked-email', {
      responseType: 'text',
      withCredentials: true
    })
  }

  public getMaskedPhone(): Observable<string | null> {
    return this.http.get('/api/account/masked-phone', {
      responseType: 'text',
      withCredentials: true
    })
  }

  public enableMfa_firstStep(strategy: MfaStrategy): Observable<ConfirmMfaChange> {
    return this.http.patch<ConfirmMfaChange>(`/api/account/mfa/enable/${strategy}/1`, null, {
      withCredentials: true
    })
  }

  public enableMfa_secondStep(strategy: MfaStrategy, totp: string, secureToken: string): Observable<ConfirmDTO> {
    const body: TotpDTO = {
      totp,
      secureToken
    }
    return this.http.patch<ConfirmDTO>(`/api/account/mfa/enable/${strategy}/2`, body, {
      withCredentials: true
    })
  }

  public disableMfa_firstStep(strategy: MfaStrategy): Observable<ConfirmMfaChange> {
    return this.http.patch<ConfirmMfaChange>(`/api/account/mfa/disable/${strategy}/1`, null, {
      withCredentials: true
    })
  }

  public disableMfa_secondStep(strategy: MfaStrategy, totp: string, secureToken: string): Observable<ConfirmDTO> {
    const body: TotpDTO = {
      totp,
      secureToken
    }
    return this.http.patch<ConfirmDTO>(`/api/account/mfa/disable/${strategy}/2`, body, {
      withCredentials: true
    })
  }

  public getBackupCodes(): Observable<string[]> {
    return this.http.patch<BackupCodesDTO>('/api/account/mfa/backup/regenerate', null, {
      withCredentials: true
    }).pipe(
      map((res) => res.codes)
    )
  }

  public getBackupCodesStatus(): Observable<BackupCodeStatusDTO> {
    return this.http.get<BackupCodeStatusDTO>('/api/account/mfa/backup/status', {
      withCredentials: true
    })
  }

  public getRemainingBackupCodes(): Observable<number> {
    return this.http.get<BackupCodeStatusDTO>('/api/account/mfa/backup/status', {
      withCredentials: true
    }).pipe(
      map((res) => res.remaining)
    )
  }

  public changeEmail_firstStep(newEmail: string): Observable<ConfirmChangeDTO> {
    const body: EmailDTO = {
      email: newEmail
    }
    return this.http.patch<ConfirmChangeDTO>('/api/account/email/1', body, {
      withCredentials: true
    })
  }

  public changeEmail_secondStep(otp: string, secureToken: string): Observable<ConfirmDTO> {
    const body: TotpDTO = {
      secureToken,
      totp: otp
    }
    return this.http.patch<ConfirmDTO>('/api/account/email/2', body, {
      withCredentials: true
    })
  }

  public changePhoneNumber_firstStep(prefix: string, phone: string): Observable<ConfirmChangeDTO> {
    const body: ChangePhoneDTO = {
      phoneNumber: phone,
      internationalPrefix: prefix
    }
    return this.http.patch<ConfirmChangeDTO>('/api/account/phone/1', body, {
      withCredentials: true
    })
  }

  public changePhoneNumber_secondStep(totp: string, secureToken: string): Observable<ConfirmDTO> {
    const body: TotpDTO = {
      secureToken,
      totp
    }
    return this.http.patch<ConfirmDTO>('/api/account/phone/2', body, {
      withCredentials: true
    })
  }

  public deletePhoneNumber_firstStep(): Observable<ConfirmChangeDTO> {
    return this.http.delete<ConfirmChangeDTO>('/api/account/phone/1', {
      withCredentials: true
    })
  }

  public deletePhoneNumber_secondStep(totp: string, secureToken: string): Observable<ConfirmWithPhoneMfaFeedback> {
    const body: TotpDTO = {
      secureToken,
      totp
    }
    return this.http.patch<ConfirmWithPhoneMfaFeedback>('/api/account/phone/del/2', body, {
      withCredentials: true
    })
  }

  public maskEmail(email: string): Observable<string> {
    const body: EmailDTO = {
      email
    }
    return this.http.post('/api/account/mask-email', body, {
      responseType: 'text',
      withCredentials: true
    })
  }

  public maskPhone(prefix: string, phone: string): Observable<string> {
    const body: ChangePhoneDTO = {
      phoneNumber: phone,
      internationalPrefix: prefix
    }
    return this.http.post('/api/account/mask-phone', body, {
      responseType: 'text',
      withCredentials: true
    })
  }

}
