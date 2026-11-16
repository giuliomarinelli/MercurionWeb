import { InjectionToken } from '@angular/core'
import type { ProvidedAccountIdDTO } from '@mercurion/rest-contracts'

export const PROVIDED_ACCOUNT_ID_CACHE_CLOCK = new InjectionToken<() => number>(
  'PROVIDED_ACCOUNT_ID_CACHE_CLOCK',
  { factory: () => () => Date.now() }
)

export interface ProvidedEmailCache {
  readonly value: ProvidedAccountIdDTO
  readonly owner: string
  readonly expiresAt: number
}
