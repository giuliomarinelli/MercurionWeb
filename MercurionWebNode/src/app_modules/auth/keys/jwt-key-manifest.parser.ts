import { createPublicKey } from 'node:crypto'
import { Environment } from 'src/config/config.schema'
import { isUtcInstant, type UtcInstant } from 'src/utils/temporal/temporal'
import { TokenType } from '../models/enums/token-type.enum'
import {
    jwtKeyAlgorithms,
    type JwtKeyDomain,
    type JwtKeyEntry,
    type JwtKeyManifest,
    type JwtKeyMaterialReference,
    type JwtLegacyKeyMapping
} from './jwt-key-manifest'

type RecordValue = Record<string, unknown>
type Failure = 'INVALID_SHAPE' | 'UNKNOWN_FIELD' | 'INVALID_VALUE' | 'ENVIRONMENT_MISMATCH'
    | 'DUPLICATE' | 'DOMAIN_SET_INVALID' | 'ALGORITHM_MISMATCH' | 'STATE_CONFLICT'
    | 'REFERENCE_MISSING' | 'INVALID_TIME_ORDER' | 'INVALID_PUBLIC_KEY'

/** Diagnostics contain schema paths and fixed codes, never rejected input values. */
export class JwtKeyManifestValidationError extends Error {
    constructor(readonly path: string, readonly code: Failure) {
        super(`Invalid JWT key manifest at ${path}: ${code}`)
        this.name = 'JwtKeyManifestValidationError'
    }
}

const purposes = Object.values(TokenType)
const aliasPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

function fail(path: string, code: Failure): never {
    throw new JwtKeyManifestValidationError(path, code)
}

function record(value: unknown, path: string, allowed: readonly string[]): RecordValue {
    if (!value || typeof value !== 'object' || Array.isArray(value)
        || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(path, 'INVALID_SHAPE')
    for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(value))) {
        if (!allowed.includes(key)) fail(path, 'UNKNOWN_FIELD')
        if (!('value' in descriptor)) fail(path, 'INVALID_SHAPE')
    }
    // Do not let inherited Object.prototype properties satisfy required fields.
    return Object.assign(Object.create(null) as RecordValue, value)
}

function alias(value: unknown, path: string): string {
    if (typeof value !== 'string' || !aliasPattern.test(value)) fail(path, 'INVALID_VALUE')
    return value
}

function timestamp(value: unknown, path: string): UtcInstant {
    if (!isUtcInstant(value)) fail(path, 'INVALID_VALUE')
    return value
}

function ordered(earlier: UtcInstant, later: UtcInstant, path: string): void {
    if (earlier > later) fail(path, 'INVALID_TIME_ORDER')
}

function materialReference(value: unknown, path: string): JwtKeyMaterialReference {
    const ref = record(value, path, ['reference', 'version'])
    return Object.freeze({ reference: alias(ref.reference, `${path}.reference`), version: alias(ref.version, `${path}.version`) })
}

function publicKey(value: unknown, path: string): string {
    // createPublicKey also accepts private keys: require a public-only SPKI envelope first.
    if (typeof value !== 'string' || value.length > 16384
        || !/^-----BEGIN PUBLIC KEY-----\r?\n[A-Za-z0-9+/=\r\n]+\r?\n-----END PUBLIC KEY-----(?:\r?\n)?$/.test(value)) {
        fail(path, 'INVALID_PUBLIC_KEY')
    }
    try {
        const key = createPublicKey(value)
        if (key.asymmetricKeyType !== 'rsa' || (key.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) {
            fail(path, 'INVALID_PUBLIC_KEY')
        }
    } catch {
        fail(path, 'INVALID_PUBLIC_KEY')
    }
    return value
}

function keyEntry(value: unknown, path: string, rsa: boolean, updatedAt: UtcInstant): JwtKeyEntry {
    const key = record(value, path, ['kid', 'material', 'createdAt', 'publicKeyPem', 'state',
        'activatedAt', 'signingStoppedAt', 'verifyUntil', 'revokedAt'])
    const base = {
        kid: alias(key.kid, `${path}.kid`),
        material: materialReference(key.material, `${path}.material`),
        createdAt: timestamp(key.createdAt, `${path}.createdAt`)
    }
    ordered(base.createdAt, updatedAt, `${path}.createdAt`)
    const publicPart = rsa && (key.state !== 'revoked' || key.publicKeyPem !== undefined)
        ? { publicKeyPem: publicKey(key.publicKeyPem, `${path}.publicKeyPem`) } : {}
    if (!rsa && key.publicKeyPem !== undefined) fail(`${path}.publicKeyPem`, 'STATE_CONFLICT')
    const allowedTimes = key.state === 'prepared' ? []
        : key.state === 'active' ? ['activatedAt']
            : key.state === 'verify-only' ? ['activatedAt', 'signingStoppedAt', 'verifyUntil']
                : key.state === 'revoked' ? ['activatedAt', 'signingStoppedAt', 'verifyUntil', 'revokedAt'] : null
    if (!allowedTimes) fail(`${path}.state`, 'INVALID_VALUE')
    for (const field of ['activatedAt', 'signingStoppedAt', 'verifyUntil', 'revokedAt']) {
        if (key[field] !== undefined && !allowedTimes.includes(field)) fail(`${path}.${field}`, 'STATE_CONFLICT')
    }
    if (key.state === 'prepared') return Object.freeze({ ...base, ...publicPart, state: 'prepared' })
    if (key.state === 'revoked') {
        const revokedAt = timestamp(key.revokedAt, `${path}.revokedAt`)
        ordered(base.createdAt, revokedAt, `${path}.revokedAt`)
        ordered(revokedAt, updatedAt, `${path}.revokedAt`)
        const activatedAt = key.activatedAt === undefined ? undefined : timestamp(key.activatedAt, `${path}.activatedAt`)
        const signingStoppedAt = key.signingStoppedAt === undefined ? undefined : timestamp(key.signingStoppedAt, `${path}.signingStoppedAt`)
        const verifyUntil = key.verifyUntil === undefined ? undefined : timestamp(key.verifyUntil, `${path}.verifyUntil`)
        if (activatedAt) {
            ordered(base.createdAt, activatedAt, `${path}.activatedAt`)
            ordered(activatedAt, revokedAt, `${path}.activatedAt`)
        }
        if (signingStoppedAt) {
            if (!activatedAt) fail(`${path}.signingStoppedAt`, 'STATE_CONFLICT')
            ordered(activatedAt, signingStoppedAt, `${path}.signingStoppedAt`)
            ordered(signingStoppedAt, revokedAt, `${path}.signingStoppedAt`)
        }
        if (verifyUntil) {
            if (!signingStoppedAt) fail(`${path}.verifyUntil`, 'STATE_CONFLICT')
            ordered(signingStoppedAt, verifyUntil, `${path}.verifyUntil`)
        }
        return Object.freeze({ ...base, ...publicPart, state: 'revoked', revokedAt,
            ...(activatedAt ? { activatedAt } : {}), ...(signingStoppedAt ? { signingStoppedAt } : {}),
            ...(verifyUntil ? { verifyUntil } : {}) })
    }
    const activatedAt = timestamp(key.activatedAt, `${path}.activatedAt`)
    ordered(base.createdAt, activatedAt, `${path}.activatedAt`)
    ordered(activatedAt, updatedAt, `${path}.activatedAt`)
    if (key.state === 'active') return Object.freeze({ ...base, ...publicPart, state: 'active', activatedAt })
    const signingStoppedAt = timestamp(key.signingStoppedAt, `${path}.signingStoppedAt`)
    const verifyUntil = timestamp(key.verifyUntil, `${path}.verifyUntil`)
    ordered(activatedAt, signingStoppedAt, `${path}.signingStoppedAt`)
    ordered(signingStoppedAt, updatedAt, `${path}.signingStoppedAt`)
    ordered(signingStoppedAt, verifyUntil, `${path}.verifyUntil`)
    return Object.freeze({ ...base, ...publicPart, state: 'verify-only', activatedAt, signingStoppedAt, verifyUntil })
}

function legacyMapping(value: unknown, path: string, purpose: TokenType, keys: readonly JwtKeyEntry[]): JwtLegacyKeyMapping {
    const legacy = record(value, path, ['kid', 'acceptUntil', 'refreshUntil'])
    const kid = alias(legacy.kid, `${path}.kid`)
    const key = keys.find(entry => entry.kid === kid)
    if (!key) fail(`${path}.kid`, 'REFERENCE_MISSING')
    const acceptUntil = timestamp(legacy.acceptUntil, `${path}.acceptUntil`)
    const refreshUntil = legacy.refreshUntil === undefined ? undefined : timestamp(legacy.refreshUntil, `${path}.refreshUntil`)
    if (refreshUntil) {
        if (purpose !== TokenType.AccessToken) fail(`${path}.refreshUntil`, 'STATE_CONFLICT')
        ordered(acceptUntil, refreshUntil, `${path}.refreshUntil`)
    }
    if (key.state === 'verify-only') ordered(refreshUntil ?? acceptUntil, key.verifyUntil, path)
    // A mapping may retain a revoked kid for audit; it never overrides key state.
    return Object.freeze({ kid, acceptUntil, ...(refreshUntil ? { refreshUntil } : {}) })
}

/**
 * Validate an already decoded JSON value, without filesystem, env, SDK or clock access.
 * The result is a detached immutable snapshot, not proof of material availability,
 * monotonic revision history, JWT validity or authorization to sign/verify a token.
 */
export function parseJwtKeyManifest(value: unknown, expectedEnvironment: Environment): JwtKeyManifest {
    const root = record(value, 'manifest', ['schemaVersion', 'environment', 'revision', 'previousRevision', 'updatedAt', 'lastOperation', 'domains'])
    if (root.schemaVersion !== 1) fail('manifest.schemaVersion', 'INVALID_VALUE')
    if (!Object.values(Environment).includes(expectedEnvironment) || root.environment !== expectedEnvironment) {
        fail('manifest.environment', 'ENVIRONMENT_MISMATCH')
    }
    if (typeof root.revision !== 'number' || !Number.isSafeInteger(root.revision) || root.revision < 1) fail('manifest.revision', 'INVALID_VALUE')
    const revision = root.revision
    const previousRevision = revision === 1 ? null : revision - 1
    if (root.previousRevision !== previousRevision) fail('manifest.previousRevision', 'INVALID_VALUE')
    const updatedAt = timestamp(root.updatedAt, 'manifest.updatedAt')
    const operation = record(root.lastOperation, 'manifest.lastOperation', ['kind', 'operator', 'reason'])
    const kind = operation.kind
    if (kind !== 'initialize' && kind !== 'prepare' && kind !== 'activate' && kind !== 'revoke' && kind !== 'retire') fail('manifest.lastOperation.kind', 'INVALID_VALUE')
    if ((revision === 1) !== (kind === 'initialize')) fail('manifest.lastOperation.kind', 'STATE_CONFLICT')
    const operator = alias(operation.operator, 'manifest.lastOperation.operator')
    if (typeof operation.reason !== 'string' || operation.reason.trim().length === 0 || operation.reason.length > 512) fail('manifest.lastOperation.reason', 'INVALID_VALUE')
    if (!Array.isArray(root.domains) || root.domains.length !== purposes.length) fail('manifest.domains', 'DOMAIN_SET_INVALID')
    const seenPurposes = new Set<TokenType>()
    const seenKids = new Set<string>()
    const seenReferences = new Set<string>()
    const seenPublicKeys = new Set<string>()
    const domains = root.domains.map((input: unknown, index: number): JwtKeyDomain => {
        const path = `manifest.domains[${index}]`
        const domain = record(input, path, ['purpose', 'algorithm', 'issuance', 'activeKid', 'keys', 'legacy'])
        if (!purposes.includes(domain.purpose as TokenType)) fail(`${path}.purpose`, 'INVALID_VALUE')
        const purpose = domain.purpose as TokenType
        if (seenPurposes.has(purpose)) fail(`${path}.purpose`, 'DUPLICATE')
        seenPurposes.add(purpose)
        const algorithm = jwtKeyAlgorithms[purpose]
        if (domain.algorithm !== algorithm) fail(`${path}.algorithm`, 'ALGORITHM_MISMATCH')
        if (domain.issuance !== 'enabled' && domain.issuance !== 'suspended') fail(`${path}.issuance`, 'INVALID_VALUE')
        if (!Array.isArray(domain.keys)) fail(`${path}.keys`, 'INVALID_SHAPE')
        const keys = domain.keys.map((input: unknown, keyIndex: number) => {
            const keyPath = `${path}.keys[${keyIndex}]`
            const key = keyEntry(input, keyPath, algorithm === 'RS256', updatedAt)
            if (seenKids.has(key.kid)) fail(`${keyPath}.kid`, 'DUPLICATE')
            seenKids.add(key.kid)
            const referenceIdentity = JSON.stringify([key.material.reference, key.material.version])
            if (seenReferences.has(referenceIdentity)) fail(`${keyPath}.material`, 'DUPLICATE')
            seenReferences.add(referenceIdentity)
            if (key.publicKeyPem) {
                const identity = createPublicKey(key.publicKeyPem).export({ format: 'der', type: 'spki' }).toString('base64')
                if (seenPublicKeys.has(identity)) fail(`${keyPath}.publicKeyPem`, 'DUPLICATE')
                seenPublicKeys.add(identity)
            }
            return key
        })
        const active = keys.filter(key => key.state === 'active')
        const activeKid = domain.activeKid === null ? null : alias(domain.activeKid, `${path}.activeKid`)
        if (domain.issuance === 'enabled') {
            if (active.length !== 1 || active[0].kid !== activeKid) fail(`${path}.activeKid`, 'STATE_CONFLICT')
        } else if (active.length !== 0 || activeKid !== null) fail(`${path}.activeKid`, 'STATE_CONFLICT')
        const legacy = domain.legacy === undefined ? undefined : legacyMapping(domain.legacy, `${path}.legacy`, purpose, keys)
        return Object.freeze({ purpose, algorithm, issuance: domain.issuance, activeKid, keys: Object.freeze(keys), ...(legacy ? { legacy } : {}) })
    })
    return Object.freeze({ schemaVersion: 1, environment: expectedEnvironment, revision, previousRevision, updatedAt,
        lastOperation: Object.freeze({ kind, operator, reason: operation.reason }), domains: Object.freeze(domains) })
}
