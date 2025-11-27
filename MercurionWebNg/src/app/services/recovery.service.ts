import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ConfirmWithRecoveryCodeDTO, ConfirmWithRecoveryTokenDTO } from '../Models/confirm.models';
import { RecoverCredentialsDTO, RecoveryCodeDTO } from '../Models/account/account.models';

@Injectable({
  providedIn: 'root'
})
export class RecoveryService {

  private readonly http = inject(HttpClient)

  private clearBrowserCache(): void {
    localStorage.clear()
    sessionStorage.clear()
  }

  public accountRecovery_firstStep(code: string, turnstileToken: string): Observable<ConfirmWithRecoveryTokenDTO> {
    const body: RecoveryCodeDTO = {
      code
    }
    this.clearBrowserCache()
    return this.http.post<ConfirmWithRecoveryTokenDTO>('/api/recovery/1', body, {
      withCredentials: true,
      headers: {
        'X-Challenge-Token': turnstileToken
      }
    })
  }

  public accountRecovery_secondStep(newEmail: string, newPassword: string, secureToken: string, turnstileToken: string): Observable<ConfirmWithRecoveryCodeDTO> {
    const body: RecoverCredentialsDTO = {
      newEmail,
      newPassword
    }
    this.clearBrowserCache()
    return this.http.post<ConfirmWithRecoveryCodeDTO>('/api/recovery/2', body, {
      withCredentials: true,
      headers: {
        'X-Challenge-Token': turnstileToken,
        'Authorization': `Bearer ${secureToken}`
      }
    })
  }

}
