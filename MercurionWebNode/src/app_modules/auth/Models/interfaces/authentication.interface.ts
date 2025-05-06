import { UUID } from "crypto"

export interface Authentication {
    userId: UUID
    sessionId: UUID
    obscuredEmail?: string
    obscuredPhoneNumber?: string
    needsMfa: boolean
    enabledMfaStrategies: string[]
    suspiciousAttempt: boolean
}