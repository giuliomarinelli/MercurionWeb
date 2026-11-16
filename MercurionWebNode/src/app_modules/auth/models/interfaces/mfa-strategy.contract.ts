import type { UUID } from 'crypto'

import { MfaStrategy } from 'src/app_modules/user/models/enums/mfa-strategy.enum'
import type { MfaAuthMetadata, TotpMetadata } from './totp-wrapper.interface'

export type MfaChallengeContext =
    | 'login'
    | 'enable'
    | 'disable'

export type MfaChallengeInput = {
    readonly userId: UUID
    readonly strategy: MfaStrategy
    readonly context: MfaChallengeContext
}

export type MfaChallengeResult = TotpMetadata & {
    readonly secureToken?: string
}

export type MfaVerificationInput = {
    readonly code: string
    readonly secureToken: string
    readonly strategy: MfaStrategy
}

export interface MfaStrategyPort {
    readonly strategy: MfaStrategy
    issue(input: MfaChallengeInput): Promise<MfaChallengeResult | MfaAuthMetadata>
    verify(input: MfaVerificationInput): Promise<boolean>
}

export interface MfaPort {
    isMfaEnabled(userId: UUID): Promise<boolean>
    getEnabledMfaStrategies(userId: UUID): Promise<MfaStrategy[]>
    sendOtpToUser(token: string, strategy: MfaStrategy, trustVerify: boolean): Promise<TotpMetadata>
    verifyUserOtpOrAppTotp(code: string, token: string, strategy: MfaStrategy): Promise<boolean>
    verifyBackupCode(code: string, token: string): Promise<boolean>
}
