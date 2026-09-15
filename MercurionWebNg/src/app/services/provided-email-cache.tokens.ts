import { InjectionToken } from '@angular/core'
import type { ProvidedEmailDTO } from '@mercurion/rest-contracts'

export const PROVIDED_EMAIL_CACHE_CLOCK = new InjectionToken<() => number>(
  'PROVIDED_EMAIL_CACHE_CLOCK',
  { factory: () => () => Date.now() }
)

export interface ProvidedEmailCache {
  readonly value: ProvidedEmailDTO
  readonly owner: string
  readonly expiresAt: number
}
