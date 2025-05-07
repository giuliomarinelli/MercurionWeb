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
}

export type Confirm_Login_FirstStepDTO = Login_FirstStep_Data & ConfirmDTO

export interface TotpMeta {
  generatedAt: number
  expiresAt: number
}

export type ConfirmWithTotpMetaDTO = ConfirmDTO & TotpMeta
