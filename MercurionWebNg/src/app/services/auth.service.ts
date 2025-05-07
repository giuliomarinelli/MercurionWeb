import { FingerprintData, ISessionDeviceInfo } from './../Models/types/auth/DTO/fingerprint.dtos';
import { Confirm_Login_FirstStepDTO, ConfirmWithAccessTokenDTO } from './../Models/types/interfaces/confirm.responses';
import { Injectable } from '@angular/core';
import { EmailDTO, Login_FirstStepWrapper } from '../Models/types/auth/DTO/login.dtos';
import { ConfirmDTO } from '../Models/types/interfaces/confirm.responses';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { ConfirmWithTotpMetaDTO } from '../Models/confirm.dtos';
import { TotpBodyDTO } from '../Models/types/auth/DTO/totp-body.dto';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  constructor(private readonly http: HttpClient) { }

  public login_stepZero(emailDTO: EmailDTO): Observable<ConfirmDTO> {
    return this.http.post<ConfirmDTO>('/api/authentication/login/0', emailDTO,
      {
        withCredentials: true
      }
    )
  }

  public login_firstStep(loginWrapper: Login_FirstStepWrapper): Observable<Confirm_Login_FirstStepDTO> {
    const { fingerprintBase64, sessionDeviceInfo, ...loginDTO } = loginWrapper
    return this.http.post<Confirm_Login_FirstStepDTO>('/api/authentication/login/1', loginDTO,
      {
        withCredentials: true,
        headers: {
          'X-Fingerprint': fingerprintBase64,
          'X-Device-Info': btoa(JSON.stringify(sessionDeviceInfo)),
          'X-Mock-IP': '91.122.12.8'
        }
      }
    )
  }

  public login_secondStep(strategy: 'EMAIL_OTP' | 'SMS_OTP', preAuthorizationToken: string, trustVerify: boolean = false): Observable<ConfirmWithTotpMetaDTO> {
    return this.http.post<ConfirmWithTotpMetaDTO>(`/api/authentication/login/${strategy}/2?trust_verify=${trustVerify}`, {},
      {
        withCredentials: true,
        headers: {
          'Authorization': `Bearer ${preAuthorizationToken}`
        }
      }
    )
  }

  public login_thirdStep(strategy: 'EMAIL_OTP' | 'SMS_OTP' | 'APP_TOTP', totpDTO: TotpBodyDTO, fingerprintData: {
    fingerprintBase64: string;
    sessionDeviceInfo: ISessionDeviceInfo;
  },
    preauthorizationToken: string): Observable<ConfirmWithAccessTokenDTO> {
    const { fingerprintBase64, sessionDeviceInfo } = fingerprintData
    return this.http.post<ConfirmWithAccessTokenDTO>(`/api/authentication/login/${strategy}/3`, totpDTO, {
      withCredentials: true,
      headers: {
        'X-Fingerprint': fingerprintBase64,
        'X-Device-Info': btoa(JSON.stringify(sessionDeviceInfo)),
        'Authorization': `Bearer ${preauthorizationToken}`,
        'X-Mock-IP': '91.122.12.8'
      }
    })
  }

}
