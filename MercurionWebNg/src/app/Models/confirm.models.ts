export type ConfirmDTO = {
  statusCode: number
  timestamp: string
  message: string
}

export interface Login_FirstStep_Data {
  obscuredEmail?: string
  obscuredPhoneNumber?: string
  needsMfa: boolean
  enabledMfaStrategies: string[]
  suspiciousAttempt: boolean
  preAuthorizationToken?: string
  accessToken?: string
  ws_accessToken?: string
  initials: string
}

export type Confirm_Login_FirstStepDTO = Login_FirstStep_Data & ConfirmDTO

export interface TotpMeta {
  generatedAt: number
  expiresAt: number
}

export type ConfirmWithTotpMetaDTO = ConfirmDTO & TotpMeta

export interface ErrorRes {
    statusCode: number
    error: string
    message?: string
    timestamp: string
    requestId: string
    path: string
}

export type ConfirmWithObsContDTO = ConfirmDTO & {
    obscuredEmail?: string
    obscuredPhoneNumber?: string
}

export type ConfirmWithAccessTokenAndInitialsDTO = ConfirmDTO & {
    accessToken: string
    ws_accessToken: string
    initials: string
}

export interface AuthenticationData {
  obscuredEmail?: string
  obscuredPhoneNumber?: string
  needsMfa: boolean
  enabledMfaStrategies: string[]
  suspiciousAttempt: boolean
}

