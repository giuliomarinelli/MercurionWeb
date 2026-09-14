import type {
  Confirm_Login_FirstStepDTO,
  SessionDeviceInfo,
  SSO_AuthProvider
} from '@mercurion/rest-contracts'

export interface LoginCredentials {
  readonly email: string
  readonly password: string
  readonly remember: boolean
  readonly turnstileToken: string
}

export interface LoginDeviceContext {
  readonly fingerprintBase64: string
  readonly sessionDeviceInfo: SessionDeviceInfo
}

export type LoginFlowResult =
  | { readonly kind: 'authenticated'; readonly initials: string }
  | { readonly kind: 'mfa'; readonly response: Confirm_Login_FirstStepDTO }

export interface LoginSsoSelection {
  readonly provider: SSO_AuthProvider
  readonly redirectTo: string | null
}
