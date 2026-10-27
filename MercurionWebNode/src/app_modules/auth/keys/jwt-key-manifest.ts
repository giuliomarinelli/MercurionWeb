import { Environment } from 'src/config/config.schema'
import type { UtcInstant } from 'src/utils/temporal/temporal'
import { TokenType } from '../models/enums/token-type.enum'
import type { JwtKeyAlgorithm, JwtKeyMaterialReference } from './jwt-key-material-source.port'

export type { JwtKeyAlgorithm, JwtKeyMaterialReference } from './jwt-key-material-source.port'

/** Policy is application-owned; neither a JWT header nor a material source selects it. */
export const jwtKeyAlgorithms = Object.freeze({
    [TokenType.AccessToken]: 'RS256',
    [TokenType.ws_AccessToken]: 'RS256',
    [TokenType.PreAuthorizationToken]: 'HS512',
    [TokenType.ActivationToken]: 'HS512',
    [TokenType.EmailVerificationToken]: 'HS512',
    [TokenType.PhoneNumberVerificationToken]: 'HS512',
    [TokenType.EmailOtpMfaActivationToken]: 'HS512',
    [TokenType.SmsOtpMfaActivationToken]: 'HS512',
    [TokenType.AppTotpMfaActivationToken]: 'HS512',
    [TokenType.EmailOtpMfaInactivationToken]: 'HS512',
    [TokenType.SmsOtpMfaInactivationToken]: 'HS512',
    [TokenType.AppTotpMfaInactivationToken]: 'HS512',
    [TokenType.ChangePasswordToken]: 'HS512',
    [TokenType.AccountRecoveryToken]: 'HS512',
    [TokenType.SSO_PreAuthorizationToken]: 'HS512'
} as const satisfies Record<TokenType, JwtKeyAlgorithm>)

interface JwtKeyMetadata {
    readonly kid: string
    readonly material: JwtKeyMaterialReference
    readonly createdAt: UtcInstant
    /** Only an RSA public key in SPKI PEM form may be persisted here. */
    readonly publicKeyPem?: string
}

export type JwtKeyEntry = JwtKeyMetadata & (
    | { readonly state: 'prepared' }
    | { readonly state: 'active'; readonly activatedAt: UtcInstant }
    | {
        readonly state: 'verify-only'
        readonly activatedAt: UtcInstant
        readonly signingStoppedAt: UtcInstant
        readonly verifyUntil: UtcInstant
    }
    | {
        readonly state: 'revoked'
        readonly revokedAt: UtcInstant
        readonly activatedAt?: UtcInstant
        readonly signingStoppedAt?: UtcInstant
        readonly verifyUntil?: UtcInstant
    }
)

export interface JwtLegacyKeyMapping {
    readonly kid: string
    readonly acceptUntil: UtcInstant
    /** Only HTTP access-token renewal has this separate, explicitly bounded window. */
    readonly refreshUntil?: UtcInstant
}

export interface JwtKeyDomain {
    readonly purpose: TokenType
    readonly algorithm: JwtKeyAlgorithm
    readonly issuance: 'enabled' | 'suspended'
    readonly activeKid: string | null
    readonly keys: readonly JwtKeyEntry[]
    readonly legacy?: JwtLegacyKeyMapping
}

export interface JwtKeyManifest {
    readonly schemaVersion: 1
    readonly environment: Environment
    readonly revision: number
    readonly previousRevision: number | null
    readonly updatedAt: UtcInstant
    readonly lastOperation: {
        readonly kind: 'initialize' | 'prepare' | 'activate' | 'revoke' | 'retire'
        readonly operator: string
        readonly reason: string
    }
    readonly domains: readonly JwtKeyDomain[]
}
