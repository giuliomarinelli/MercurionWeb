import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ChangePasswordDTO, MfaStrategy, ProfileDTO, SessionDTO, UserData } from '../Models/account/account.models';
import { Observable, of, tap } from 'rxjs';
import { ConfirmDTO, ConfirmMfaChange } from '../Models/confirm.models';
import { ConfirmWithObsContDTO } from '../Models/confirm.models';
import { EmailDTO } from '../Models/auth/login.models';
import { TotpDTO } from '../Models/auth/totp.models';


@Injectable({
  providedIn: 'root'
})
export class AccountService {

  private USER_KEY = 'user_d'
  private CACHE_TIME = 15 * 60 * 1000 // 15 minuti

  constructor(private readonly http: HttpClient) { }

  private getStoredEmail(): string | null {
    const raw = sessionStorage?.getItem(this.USER_KEY)
    if (!raw) return null
    const user_d = JSON.parse(raw) as UserData
    if (!user_d?.email) return null
    if (user_d.ts && Date.now() - user_d.ts < this.CACHE_TIME) {
      return user_d.email
    }
    return null
  }

  private setStoredEmail(email: string): void {
    if (!email) return
    const user_d = {
      email,
      ts: Date.now()
    }
    sessionStorage?.setItem(this.USER_KEY, JSON.stringify(user_d))
  }

  public getEmail(): Observable<string> {
    const storedEmail = this.getStoredEmail()
    if (storedEmail) {
      return of(storedEmail)
    } else {
      return this.http.get('/api/account/email', {
        withCredentials: true,
        responseType: 'text'
      }).pipe(
        tap(email => this.setStoredEmail(email))
      )
    }
  }

  public sendForgottenPasswordLink(dto: EmailDTO, turnstileToken: string): Observable<ConfirmWithObsContDTO> {
    return this.http.post<ConfirmDTO>('/api/account/forgotten-password', dto, {
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

  public activateAccount(token: string): Observable<ConfirmDTO> {
    return this.http.patch<ConfirmDTO>(`/api/account/activate?t=${token}`, null, {
      withCredentials: true
    })
  }

  public getProfileRegistry(getRecentHistory = true): Observable<ProfileDTO> {
    const suffix = getRecentHistory ? '' : '?get_recent_history=false'
    return this.http.get<ProfileDTO>(`/api/account/profile-registry${suffix}`, {
      withCredentials: true
    })
  }

  public isMfaEnabled(): Observable<boolean> {
    return this.http.get<boolean>('/api/account/is-mfa-enabled', {
      withCredentials: true
    })
  }

  public getEnabledMfaStrategies(): Observable<MfaStrategy[]> {
    return this.http.get<MfaStrategy[]>('/api/account/mfa-active-strategies', {
      withCredentials: true
    })
  }

  public getActiveSessions(): Observable<SessionDTO[]> {
    return this.http.get<SessionDTO[]>('/api/account/active-sessions', {
      withCredentials: true
    })
  }

  public getCurrentVersion(): Observable<string> {
    return this.http.get('/api/account/current-version', {
      responseType: 'text',
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
    return this.http.patch<ConfirmDTO>(`/api/account/mfa/enable/${strategy}/2`, totp, {
      withCredentials: true
    })
  }

  public disableMfa_secondStep(strategy: MfaStrategy): Observable<ConfirmMfaChange> {
    return this.http.patch<ConfirmMfaChange>(`/api/account/mfa/disable/${strategy}/1`, null, {
      withCredentials: true
    })
  }

  public disable_secondStep(strategy: MfaStrategy, totp: string, secureToken: string): Observable<ConfirmDTO> {
    const body: TotpDTO = {
      totp,
      secureToken
    }
    return this.http.patch<ConfirmDTO>(`/api/account/mfa/disable/${strategy}/2`, totp, {
      withCredentials: true
    })
  }

}
