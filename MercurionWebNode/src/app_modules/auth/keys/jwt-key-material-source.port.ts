import type { Environment } from 'src/config/config.schema'
import type { TokenType } from '../models/enums/token-type.enum'

export type JwtKeyAlgorithm = 'RS256' | 'HS512'

/** Logical aliases, not credentials, URLs, filesystem paths or provider-specific SDK parameters. */
export interface JwtKeyMaterialReference {
    readonly reference: string
    readonly version: string
}

export const JWT_KEY_MATERIAL_SOURCE = Symbol('JWT_KEY_MATERIAL_SOURCE')

export interface JwtKeyMaterialRequest {
    readonly environment: Environment
    readonly purpose: TokenType
    readonly kid: string
    readonly algorithm: JwtKeyAlgorithm
    readonly material: JwtKeyMaterialReference
}

/** Confidential, process-memory-only output: never serialize into a manifest, log or exception. */
export type JwtKeyMaterial =
    | {
        readonly algorithm: 'RS256'
        /** Raw PEM is reserved for the local development/test adapter. */
        readonly encoding: 'pem' | 'base64-pem'
        readonly publicKey: string
        readonly privateKey?: string
    }
    | {
        readonly algorithm: 'HS512'
        /** utf8 preserves legacy bytes; new secrets use explicitly validated Base64 bytes. */
        readonly encoding: 'utf8' | 'base64'
        readonly secret: string
    }

/**
 * Resolve only references admitted by a validated, environment-scoped manifest.
 * Cache identity must include the full request, not just kid. The caller must
 * validate the returned encoding/material/algorithm before use. Implementations
 * must not derive URLs/paths from unverified JWT headers or silently fall back
 * across providers, versions or environments. No adapter is wired by this contract.
 */
export interface JwtKeyMaterialSource {
    resolve(request: JwtKeyMaterialRequest): Promise<JwtKeyMaterial>
}

export type JwtKeyMaterialFailure = 'UNAVAILABLE' | 'NOT_FOUND' | 'INVALID_MATERIAL'

/** Deliberately excludes provider responses, requested values and raw causes. */
export class JwtKeyMaterialSourceError extends Error {
    constructor(readonly code: JwtKeyMaterialFailure) {
        super('JWT key material could not be resolved')
        this.name = 'JwtKeyMaterialSourceError'
    }
}
