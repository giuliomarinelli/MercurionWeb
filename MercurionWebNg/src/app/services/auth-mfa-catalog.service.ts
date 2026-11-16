import { Injectable } from '@angular/core'
import type { MfaStrategy } from '@mercurion/rest-contracts'

@Injectable({ providedIn: 'root' })
export class AuthMfaCatalogService {
  getStrategiesDescriptionMap(): Map<MfaStrategy, string> {
    return new Map([
      ['EMAIL_OTP', 'autenticazione a più fattori via mail'],
      ['SMS_OTP', 'autenticazione a più fattori via sms'],
      ['APP_TOTP', 'autenticazione a più fattori via app']
    ])
  }
}
