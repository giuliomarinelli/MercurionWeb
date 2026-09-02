import { UUID } from "crypto"
import type { MfaStrategy } from '@mercurion/rest-contracts'

export interface Authentication {
    userId: UUID
    sessionId: UUID
    deviceId: UUID
    obscuredEmail?: string
    obscuredPhoneNumber?: string
    needsMfa: boolean
    enabledMfaStrategies: MfaStrategy[]
    suspiciousAttempt: boolean
}