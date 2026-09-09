import { HttpClient } from '@angular/common/http'
import { inject, Injectable } from '@angular/core'
import {
  LOCAL_DUMMY_AUTH,
  type ConfirmWithAccessTokenAndInitialsDTO
} from '@mercurion/rest-contracts'
import { firstValueFrom } from 'rxjs'

import { APP_CONFIG, type AppConfig } from '../config/app-config'
import type { AuthCompletion } from './auth-state.store'
import { FingerprintService } from './fingerprint.service'

export function canUseLocalDummyAuth(config: AppConfig, origin: string): boolean {
  return config.capabilities.localDummyAuth &&
    config.environment === 'development' &&
    !config.production &&
    origin === LOCAL_DUMMY_AUTH.canonicalOrigin
}

@Injectable({ providedIn: 'root' })
export class LocalDummyAuthService {
  private readonly config = inject(APP_CONFIG)
  private readonly http = inject(HttpClient)
  private readonly fingerprintService = inject(FingerprintService)

  isAvailable(): boolean {
    return typeof location !== 'undefined' && canUseLocalDummyAuth(this.config, location.origin)
  }

  isActive(): boolean {
    if (!this.isAvailable()) return false
    try {
      return localStorage.getItem(LOCAL_DUMMY_AUTH.storageKey) === LOCAL_DUMMY_AUTH.marker
    } catch {
      return false
    }
  }

  async activate(): Promise<AuthCompletion> {
    if (!this.isAvailable()) {
      throw new Error('Local dummy authentication is unavailable outside the canonical development origin')
    }

    const { fingerprintDataEnc, sessionDeviceInfo } =
      await this.fingerprintService.getSanitizedFingerprint()
    const response = await firstValueFrom(this.http.post<ConfirmWithAccessTokenAndInitialsDTO>(
      '/api/authentication/local-dummy',
      null,
      {
        withCredentials: true,
        headers: {
          [LOCAL_DUMMY_AUTH.headerName]: LOCAL_DUMMY_AUTH.marker,
          'X-Fingerprint': fingerprintDataEnc,
          'X-Device-Info': btoa(JSON.stringify(sessionDeviceInfo))
        }
      }
    ))

    localStorage.setItem(LOCAL_DUMMY_AUTH.storageKey, LOCAL_DUMMY_AUTH.marker)

    return {
      initials: response.initials,
      accessToken: response.accessToken,
      wsAccessToken: response.ws_accessToken
    }
  }

}
