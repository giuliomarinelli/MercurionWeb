import { JwtService, type JwtVerifyOptions } from '@nestjs/jwt'
import { createPublicKey } from 'node:crypto'
import { isUUID } from 'class-validator'
import type { Environment } from 'src/config/config.schema'
import { TokenType } from '../models/enums/token-type.enum'
import type { AppJwtPayload } from '../models/interfaces/app-jwt-payload.interface'
import { jwtKeyAlgorithms, type JwtKeyDomain, type JwtKeyEntry, type JwtKeyManifest } from './jwt-key-manifest'
import { parseJwtKeyManifest } from './jwt-key-manifest.parser'
import { JwtKeyMaterialLoader } from './jwt-key-material.loader'
import { boundedKeyOperation, JwtKeyRuntimeError } from './jwt-key-runtime-error'
import type { JwtKeyRuntimeOptions } from './jwt-key-runtime.module'

type Selection = { manifest: JwtKeyManifest; domain: JwtKeyDomain; key: JwtKeyEntry; legacy: boolean }
const kidPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/

/** Cryptographic runtime; state is refreshed even when material is already cached. */
export class JwtKeyRing {
    private readonly loader: JwtKeyMaterialLoader
    private revision = 0
    private content = ''
    private readonly identities = new Map<string, string>()
    private readonly revoked = new Set<string>()
    private readonly publicOwners = new Map<string, string>()
    private readonly referenceOwners = new Map<string, string>()
    private readonly connections = new Map<string, { kid?: string; deny: () => void }>()
    private connectionTimer?: ReturnType<typeof setInterval>
    private reconciling = false

    constructor(private readonly options: JwtKeyRuntimeOptions, private readonly environment: Environment, private readonly jwt: JwtService) {
        if (!options?.manifestSource || typeof options.manifestSource.read !== 'function'
            || !options.materialSource || typeof options.materialSource.resolve !== 'function') throw new JwtKeyRuntimeError('REGISTRY_UNAVAILABLE')
        this.loader = new JwtKeyMaterialLoader(options.materialSource)
    }

    async initialize(): Promise<void> {
        const manifest = await this.read()
        for (const domain of manifest.domains) if (domain.issuance === 'enabled') this.select(manifest, domain.purpose)
        // Warm admitted HMAC verification keys too, so manager outages do not break old tokens after rotation.
        for (const domain of manifest.domains) for (const key of domain.keys) {
            if (key.state === 'revoked' || Date.now() < Date.parse(key.createdAt)
                || (key.state === 'verify-only' && Date.now() >= Date.parse(key.verifyUntil))) continue
            if (domain.algorithm === 'RS256' && key.state !== 'active') continue
            const selected = { manifest, domain, key, legacy: domain.legacy?.kid === key.kid }
            const material = await this.loader.load(this.request(selected), key, selected.legacy)
            if (material.algorithm === 'RS256' && !material.privateKey) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
        }
        if ((await this.read()).revision !== manifest.revision) throw new JwtKeyRuntimeError('REGISTRY_CHANGED')
    }

    async sign(payload: object, purpose: TokenType): Promise<string> {
        const selected = this.select(await this.read(), purpose)
        const material = await this.loader.load(this.request(selected), selected.key, selected.legacy)
        if (material.algorithm === 'RS256' && !material.privateKey) throw new JwtKeyRuntimeError('INVALID_MATERIAL')
        const token = material.algorithm === 'RS256'
            ? await this.jwt.signAsync(payload, { algorithm: 'RS256', privateKey: material.privateKey!, keyid: selected.key.kid })
            : await this.jwt.signAsync(payload, { algorithm: 'HS512', secret: material.secret, keyid: selected.key.kid })
        const current = this.select(await this.read(), purpose)
        if (current.key.kid !== selected.key.kid) throw new JwtKeyRuntimeError('REGISTRY_CHANGED')
        return token
    }

    /** Call only after normal signature, principal and session checks. Stores admission metadata, never the token. */
    async watchVerifiedConnection(id: string, token: string, deny: () => void): Promise<() => void> {
        const kid = this.headerKid(token, TokenType.ws_AccessToken)
        this.select(await this.read(), TokenType.ws_AccessToken, { kid, refresh: false })
        const binding = { kid, deny }
        this.connections.set(id, binding)
        if (!this.connectionTimer) {
            this.connectionTimer = setInterval(() => { void this.reconcileConnections() }, 1000)
            this.connectionTimer.unref?.()
        }
        return () => {
            if (this.connections.get(id) === binding) this.connections.delete(id)
            if (this.connections.size === 0) { clearInterval(this.connectionTimer); this.connectionTimer = undefined }
        }
    }

    close(): void {
        clearInterval(this.connectionTimer)
        this.connectionTimer = undefined
        this.connections.clear()
    }

    private async reconcileConnections(): Promise<void> {
        if (this.reconciling || this.connections.size === 0) return
        this.reconciling = true
        // Snapshot before I/O: a freshly reauthenticated socket must not be judged against an older read.
        const bindings = [...this.connections]
        try {
            let manifest: JwtKeyManifest | undefined
            try { manifest = await this.read() } catch {
                // Tolerate one interrupted atomic publication, while keeping the total eviction budget below five seconds.
                await new Promise(resolve => setTimeout(resolve, 250))
                try { manifest = await this.read() } catch { /* Fail closed, independently of the material manager. */ }
            }
            for (const [id, binding] of bindings) {
                if (this.connections.get(id) !== binding) continue
                let allowed = false
                if (manifest) {
                    try { this.select(manifest, TokenType.ws_AccessToken, { kid: binding.kid, refresh: false }); allowed = true } catch { /* Deny. */ }
                }
                if (!allowed) {
                    this.connections.delete(id)
                    try { binding.deny() } catch { /* One connection cannot prevent eviction of the others. */ }
                }
            }
        } finally {
            this.reconciling = false
            if (this.connections.size === 0) { clearInterval(this.connectionTimer); this.connectionTimer = undefined }
        }
    }

    async verify(token: string, purpose: TokenType, options: Pick<JwtVerifyOptions, 'issuer' | 'audience' | 'clockTolerance' | 'ignoreExpiration'>): Promise<AppJwtPayload> {
        const kid = this.headerKid(token, purpose)
        const selected = this.select(await this.read(), purpose, { kid, refresh: options.ignoreExpiration === true })
        let payload: AppJwtPayload
        if (selected.domain.algorithm === 'RS256') {
            // Public verification must not depend on the secret manager being reachable.
            payload = await this.jwt.verifyAsync<AppJwtPayload>(token, { ...options, algorithms: ['RS256'], publicKey: selected.key.publicKeyPem! })
        } else {
            const material = await this.loader.load(this.request(selected), selected.key, selected.legacy)
            if (material.algorithm !== 'HS512') throw new JwtKeyRuntimeError('INVALID_MATERIAL')
            payload = await this.jwt.verifyAsync<AppJwtPayload>(token, { ...options, algorithms: ['HS512'], secret: material.secret })
        }
        if (!payload || typeof payload !== 'object' || payload.typ !== purpose
            || typeof payload.iss !== 'string' || typeof payload.sub !== 'string' || payload.sub.length === 0
            || typeof payload.jti !== 'string' || !isUUID(payload.jti)
            || typeof payload.scp !== 'string' || !Number.isFinite(payload.exp) || !Number.isFinite(payload.iat)
            || payload.exp <= payload.iat
            || ([TokenType.AccessToken, TokenType.ws_AccessToken, TokenType.PreAuthorizationToken].includes(purpose)
                && (typeof payload.sid !== 'string' || !isUUID(payload.sid)))) throw new JwtKeyRuntimeError('INVALID_HEADER')
        this.select(await this.read(), purpose, { kid, refresh: options.ignoreExpiration === true })
        return payload
    }

    private headerKid(token: string, purpose: TokenType): string | undefined {
        if (typeof token !== 'string' || token.length > 16384 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(token)) throw new JwtKeyRuntimeError('INVALID_HEADER')
        let header: unknown
        try { header = this.jwt.decode(token, { complete: true })?.header } catch { throw new JwtKeyRuntimeError('INVALID_HEADER') }
        if (!header || typeof header !== 'object' || Array.isArray(header)) throw new JwtKeyRuntimeError('INVALID_HEADER')
        const value = header as Record<string, unknown>
        if (Object.keys(value).some(key => !['alg', 'typ', 'kid'].includes(key)) || value.alg !== jwtKeyAlgorithms[purpose]
            || (value.typ !== undefined && value.typ !== 'JWT')) throw new JwtKeyRuntimeError('INVALID_HEADER')
        if (!Object.hasOwn(value, 'kid')) return undefined
        if (typeof value.kid !== 'string' || !kidPattern.test(value.kid)) throw new JwtKeyRuntimeError('INVALID_HEADER')
        return value.kid
    }

    private select(manifest: JwtKeyManifest, purpose: TokenType, verification?: { kid?: string; refresh: boolean }): Selection {
        const domain = manifest.domains.find(entry => entry.purpose === purpose)
        if (!domain) throw new JwtKeyRuntimeError('REGISTRY_UNAVAILABLE')
        let kid = verification?.kid ?? domain.activeKid
        if (verification && verification.kid === undefined) {
            const legacy = domain.legacy
            const until = verification.refresh && purpose === TokenType.AccessToken ? legacy?.refreshUntil ?? legacy?.acceptUntil : legacy?.acceptUntil
            if (!legacy || !until || Date.now() >= Date.parse(until)) throw new JwtKeyRuntimeError('KEY_NOT_ADMITTED')
            kid = legacy.kid
        }
        const key = domain.keys.find(entry => entry.kid === kid)
        if (!verification && (domain.issuance !== 'enabled' || !key || key.state !== 'active')) throw new JwtKeyRuntimeError('ISSUANCE_UNAVAILABLE')
        if (!key || key.state === 'revoked' || this.revoked.has(key.kid)
            || Date.now() < Date.parse(key.createdAt)
            || (key.state === 'active' && Date.now() < Date.parse(key.activatedAt))
            || (key.state === 'verify-only' && Date.now() >= Date.parse(key.verifyUntil))) throw new JwtKeyRuntimeError('KEY_NOT_ADMITTED')
        return { manifest, domain, key, legacy: domain.legacy?.kid === key.kid }
    }

    private request(selected: Selection) {
        return Object.freeze({ environment: this.environment, purpose: selected.domain.purpose, kid: selected.key.kid,
            algorithm: selected.domain.algorithm, material: selected.key.material })
    }

    private async read(): Promise<JwtKeyManifest> {
        try {
            const manifest = parseJwtKeyManifest(await boundedKeyOperation(() => this.options.manifestSource.read(), 1000, 'REGISTRY_UNAVAILABLE'), this.environment)
            const content = JSON.stringify(manifest)
            if (manifest.revision < this.revision || (manifest.revision === this.revision && content !== this.content)) throw new JwtKeyRuntimeError('REGISTRY_UNAVAILABLE')
            const entries: [string, string][] = []
            const publicEntries: [string, string][] = []
            const referenceEntries: [string, string][] = []
            for (const domain of manifest.domains) for (const key of domain.keys) {
                const publicIdentity = key.publicKeyPem ? createPublicKey(key.publicKeyPem).export({ format: 'der', type: 'spki' }).toString('base64') : null
                const referenceIdentity = JSON.stringify([key.material.reference, key.material.version])
                const identity = JSON.stringify([domain.purpose, domain.algorithm, key.material.reference, key.material.version,
                    publicIdentity])
                const previous = this.identities.get(key.kid)
                // A revoked key may drop its public part during retirement, but cannot be resurrected.
                if ((previous !== undefined && previous !== identity && key.state !== 'revoked')
                    || (this.revoked.has(key.kid) && key.state !== 'revoked')) throw new JwtKeyRuntimeError('REGISTRY_UNAVAILABLE')
                const publicOwner = publicIdentity === null ? undefined : this.publicOwners.get(publicIdentity)
                const referenceOwner = this.referenceOwners.get(referenceIdentity)
                if ((publicOwner !== undefined && publicOwner !== key.kid)
                    || (referenceOwner !== undefined && referenceOwner !== key.kid)) throw new JwtKeyRuntimeError('REGISTRY_UNAVAILABLE')
                if (publicIdentity !== null) publicEntries.push([publicIdentity, key.kid])
                referenceEntries.push([referenceIdentity, key.kid])
                entries.push([key.kid, identity])
            }
            for (const [kid, identity] of entries) this.identities.set(kid, identity)
            for (const [identity, kid] of publicEntries) this.publicOwners.set(identity, kid)
            for (const [identity, kid] of referenceEntries) this.referenceOwners.set(identity, kid)
            for (const domain of manifest.domains) for (const key of domain.keys) if (key.state === 'revoked') this.revoked.add(key.kid)
            this.revision = manifest.revision
            this.content = content
            return manifest
        } catch { throw new JwtKeyRuntimeError('REGISTRY_UNAVAILABLE') }
    }
}
