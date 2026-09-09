import type { MfaStrategy } from '@mercurion/rest-contracts'

export const PRE_AUTH_STATE_VERSION = 1 as const
export const PRE_AUTH_STATE_KIND = 'mfa' as const

export interface PersistedPreAuthState {
  version: typeof PRE_AUTH_STATE_VERSION
  kind: typeof PRE_AUTH_STATE_KIND
  preAuthorizationToken: string
  expiresAt: number
  enabledMfaStrategies: MfaStrategy[]
  suspiciousAttempt: boolean
  obscuredEmail?: string
  obscuredPhoneNumber?: string
}

export type PreAuthReadResult =
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'expired' }
  | { status: 'valid'; state: PersistedPreAuthState }
