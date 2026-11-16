import { createHash, createPrivateKey, createPublicKey, timingSafeEqual, type KeyObject } from 'node:crypto'
import { Environment } from 'src/config/config.schema'
import type { JwtKeyEntry } from './jwt-key-manifest'
import { JwtKeyMaterialSourceError, type JwtKeyMaterial, type JwtKeyMaterialRequest, type JwtKeyMaterialSource } from './jwt-key-material-source.port'
import { boundedKeyOperation, JwtKeyRuntimeError } from './jwt-key-runtime-error'

type LoadedMaterial = { readonly algorithm: 'RS256'; readonly publicKey: string; readonly privateKey?: KeyObject }
    | { readonly algorithm: 'HS512'; readonly secret: Buffer }

function base64Bytes(value: string): Buffer {
    if (value.length === 0 || value.length > 32768 || value.length % 4 !== 0
        || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
    const bytes = Buffer.from(value, 'base64')
    if (bytes.toString('base64') !== value) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
    return bytes
}

function validateMaterial(raw: JwtKeyMaterial, request: JwtKeyMaterialRequest, entry: JwtKeyEntry, legacy: boolean): LoadedMaterial {
    if (!raw || raw.algorithm !== request.algorithm) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
    if (raw.algorithm === 'HS512') {
        if (typeof raw.secret !== 'string') throw new JwtKeyRuntimeError('INVALID_MATERIAL')
        const secret = raw.encoding === 'base64' ? base64Bytes(raw.secret)
            : raw.encoding === 'utf8' && legacy && raw.secret.length <= 32768 ? Buffer.from(raw.secret, 'utf8') : null
        // Existing shorter secrets need an explicitly agreed retirement policy, not an automatic exception.
        if (!secret || secret.length < 64) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
        return { algorithm: 'HS512', secret }
    }
    if (raw.encoding !== 'base64-pem' && !(raw.encoding === 'pem'
        && (request.environment === Environment.Development || request.environment === Environment.Test))) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
    if (typeof raw.publicKey !== 'string' || raw.publicKey.length > 32768) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
    const publicPem = raw.encoding === 'base64-pem' ? base64Bytes(raw.publicKey).toString('utf8') : raw.publicKey
    if (!publicPem.startsWith('-----BEGIN PUBLIC KEY-----')) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
    const publicKey = createPublicKey(publicPem)
    if (publicKey.asymmetricKeyType !== 'rsa' || (publicKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048 || !entry.publicKeyPem) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
    const der = publicKey.export({ format: 'der', type: 'spki' })
    const expected = createPublicKey(entry.publicKeyPem).export({ format: 'der', type: 'spki' })
    if (der.length !== expected.length || !timingSafeEqual(der, expected)) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
    let privateKey: KeyObject | undefined
    if (raw.privateKey !== undefined) {
        if (typeof raw.privateKey !== 'string' || raw.privateKey.length > 32768) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
        const pem = raw.encoding === 'base64-pem' ? base64Bytes(raw.privateKey).toString('utf8') : raw.privateKey
        if (!/^-----BEGIN (?:RSA )?PRIVATE KEY-----/.test(pem)) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
        privateKey = createPrivateKey(pem)
        if (privateKey.asymmetricKeyType !== 'rsa' || (privateKey.asymmetricKeyDetails?.modulusLength ?? 0) < 2048) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
        const derived = createPublicKey(privateKey).export({ format: 'der', type: 'spki' })
        if (derived.length !== der.length || !timingSafeEqual(derived, der)) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
    }
    return { algorithm: 'RS256', publicKey: publicPem, ...(privateKey ? { privateKey } : {}) }
}

/** Bounded process-memory cache of material only; admission/revocation is always checked separately. */
export class JwtKeyMaterialLoader {
    private readonly cache = new Map<string, LoadedMaterial>()
    private readonly pending = new Map<string, Promise<LoadedMaterial>>()
    private readonly hmacOwners = new Map<string, string>()

    constructor(private readonly source: JwtKeyMaterialSource) {}

    async load(request: JwtKeyMaterialRequest, entry: JwtKeyEntry, legacy: boolean): Promise<LoadedMaterial> {
        const identity = JSON.stringify([request.environment, request.purpose, request.kid, request.algorithm,
            request.material.reference, request.material.version, entry.publicKeyPem ?? null, legacy])
        const cached = this.cache.get(identity)
        if (cached) return cached
        const existing = this.pending.get(identity)
        if (existing) return existing
        if (this.pending.size >= 8) throw new JwtKeyRuntimeError('MATERIAL_UNAVAILABLE')
        const operation = this.resolve(request, entry, legacy).then(material => {
            if (material.algorithm === 'HS512') {
                const fingerprint = createHash('sha256').update(material.secret).digest('hex')
                const owner = JSON.stringify([request.purpose, request.kid])
                const previous = this.hmacOwners.get(fingerprint)
                if (previous !== undefined && previous !== owner) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
                this.hmacOwners.set(fingerprint, owner)
            }
            if (this.cache.size >= 128) this.cache.delete(this.cache.keys().next().value!)
            this.cache.set(identity, material)
            return material
        }).finally(() => this.pending.delete(identity))
        this.pending.set(identity, operation)
        return operation
    }

    private async resolve(request: JwtKeyMaterialRequest, entry: JwtKeyEntry, legacy: boolean): Promise<LoadedMaterial> {
        let raw: JwtKeyMaterial
        try {
            raw = await boundedKeyOperation(() => this.source.resolve(request), 5000, 'MATERIAL_UNAVAILABLE')
        } catch (error) {
            throw new JwtKeyRuntimeError(error instanceof JwtKeyMaterialSourceError && error.code === 'INVALID_MATERIAL'
                ? 'INVALID_MATERIAL' : 'MATERIAL_UNAVAILABLE')
        }
        try { return validateMaterial(raw, request, entry, legacy) } catch { throw new JwtKeyRuntimeError('INVALID_MATERIAL') }
    }
}
