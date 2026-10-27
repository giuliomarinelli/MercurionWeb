import { createHash } from 'node:crypto'
import type { Environment } from 'src/config/config.schema'
import { TokenType } from '../models/enums/token-type.enum'
import type { JwtKeyEntry, JwtKeyManifest } from './jwt-key-manifest'
import { parseJwtKeyManifest } from './jwt-key-manifest.parser'
import { JwtKeyMaterialLoader } from './jwt-key-material.loader'
import type { JwtKeyMaterialSource } from './jwt-key-material-source.port'
import { JwtKeyFileRegistry, JwtKeyRegistryError, validateJwtKeyTransition } from './jwt-key-registry'

export type JwtKeyAdministrationCommand = {
    readonly kind: 'prepare'; readonly purpose: TokenType; readonly key: JwtKeyEntry
} | {
    readonly kind: 'activate'; readonly purpose: TokenType; readonly kid: string;
    readonly verifyUntil: string; readonly distributionConfirmed: true
} | {
    readonly kind: 'revoke'; readonly purpose: TokenType; readonly kid: string; readonly suspendIssuance?: true
} | {
    readonly kind: 'retire'; readonly purpose: TokenType; readonly kid: string
}

export interface JwtKeyAdministrationRequest {
    readonly timestamp: string
    readonly expectedRevision: number
    readonly operator: string
    readonly reason: string
    readonly command: JwtKeyAdministrationCommand
}

export interface JwtKeyAdministrationPreview {
    readonly revision: number
    readonly previousRevision: number
    readonly digest: string
    readonly operation: string
    readonly purpose: TokenType
    readonly kid: string
    readonly issuance: string
}

/** Operational writer. Provider material is resolved in memory, never persisted with the proposal. */
export class JwtKeyAdministration {
    constructor(private readonly registry: JwtKeyFileRegistry, private readonly environment: Environment,
        private readonly materialSource?: JwtKeyMaterialSource) {}

    async change(request: JwtKeyAdministrationRequest, applyDigest?: string): Promise<JwtKeyAdministrationPreview> {
        const previous = await this.registry.read()
        if (previous.revision !== request.expectedRevision) throw new JwtKeyRegistryError('CONFLICT')
        const next = this.propose(previous, request)
        const hash = createHash('sha256').update(JSON.stringify(next)).digest('hex')
        const { command } = request
        if (applyDigest !== undefined) {
            // The operator approves the concrete preview, including its timestamp. Rebuild with its explicit timestamp below.
            if (applyDigest !== hash) throw new JwtKeyRegistryError('CONFLICT')
            await this.validateMaterial(next, command)
            await this.registry.commit(request.expectedRevision, next)
        }
        return { revision: next.revision, previousRevision: previous.revision, digest: hash,
            operation: command.kind, purpose: command.purpose, kid: command.kind === 'prepare' ? command.key.kid : command.kid,
            issuance: next.domains.find(domain => domain.purpose === command.purpose)!.issuance }
    }

    private propose(previous: JwtKeyManifest, request: JwtKeyAdministrationRequest): JwtKeyManifest {
        // Runtime request boundaries are closed even if a caller bypasses TypeScript.
        const allowed = ['expectedRevision', 'operator', 'reason', 'command', 'timestamp']
        if (!request || Object.keys(request).some(key => !allowed.includes(key))) throw new JwtKeyRegistryError('INVALID_TRANSITION')
        const command = request.command
        const fields = command?.kind === 'prepare' ? ['kind', 'purpose', 'key']
            : command?.kind === 'activate' ? ['kind', 'purpose', 'kid', 'verifyUntil', 'distributionConfirmed']
                : command?.kind === 'revoke' ? ['kind', 'purpose', 'kid', 'suspendIssuance']
                    : command?.kind === 'retire' ? ['kind', 'purpose', 'kid'] : []
        if (!command || fields.length === 0 || Object.keys(command).some(key => !fields.includes(key))) throw new JwtKeyRegistryError('INVALID_TRANSITION')
        const timestamp = request.timestamp
        if (typeof timestamp !== 'string' || Date.parse(timestamp) > Date.now()
            || Date.now() - Date.parse(timestamp) > 300000) throw new JwtKeyRegistryError('INVALID_TRANSITION')
        const value = JSON.parse(JSON.stringify(previous)) as {
            revision: number; previousRevision: number; updatedAt: string; lastOperation: object;
            domains: { purpose: TokenType; keys: Record<string, unknown>[]; activeKid: string | null; issuance: string; legacy?: { acceptUntil: string; refreshUntil?: string } }[]
        }
        value.previousRevision = previous.revision; value.revision++
        value.updatedAt = timestamp
        value.lastOperation = { kind: command.kind, operator: request.operator, reason: request.reason }
        const domain = value.domains.find(entry => entry.purpose === command.purpose)
        if (!domain) throw new JwtKeyRegistryError('INVALID_TRANSITION')
        if (command.kind === 'prepare') {
            if (command.key?.state !== 'prepared') throw new JwtKeyRegistryError('INVALID_TRANSITION')
            domain.keys.push(command.key as unknown as Record<string, unknown>)
        } else {
            const key = domain.keys.find(entry => entry.kid === command.kid)
            if (!key) throw new JwtKeyRegistryError('INVALID_TRANSITION')
            if (command.kind === 'activate') {
                if (key.state !== 'prepared' || command.distributionConfirmed !== true
                    || Date.parse(command.verifyUntil) <= Date.now()) throw new JwtKeyRegistryError('INVALID_TRANSITION')
                const active = domain.keys.find(entry => entry.kid === domain.activeKid)
                if (active) Object.assign(active, { state: 'verify-only', signingStoppedAt: timestamp, verifyUntil: command.verifyUntil })
                Object.assign(key, { state: 'active', activatedAt: timestamp })
                domain.activeKid = command.kid; domain.issuance = 'enabled'
            } else if (command.kind === 'revoke') {
                if (key.state === 'revoked' || (domain.activeKid === command.kid && command.suspendIssuance !== true)) throw new JwtKeyRegistryError('INVALID_TRANSITION')
                Object.assign(key, { state: 'revoked', revokedAt: timestamp })
                if (domain.activeKid === command.kid) { domain.activeKid = null; domain.issuance = 'suspended' }
            } else {
                // Retire never deletes a tombstone and never deletes material in the external manager.
                if (key.state !== 'revoked') throw new JwtKeyRegistryError('INVALID_TRANSITION')
                delete key.publicKeyPem
            }
        }
        const next = parseJwtKeyManifest(value, this.environment)
        validateJwtKeyTransition(previous, next)
        return next
    }

    private async validateMaterial(manifest: JwtKeyManifest, command: JwtKeyAdministrationCommand): Promise<void> {
        if (command.kind !== 'prepare' && command.kind !== 'activate') return
        if (!this.materialSource) throw new JwtKeyRegistryError('UNAVAILABLE')
        const domain = manifest.domains.find(entry => entry.purpose === command.purpose)!
        const key = domain.keys.find(entry => entry.kid === (command.kind === 'prepare' ? command.key.kid : command.kid))!
        const loader = new JwtKeyMaterialLoader(this.materialSource)
        for (const other of manifest.domains) for (const candidate of other.keys) {
            if (other.algorithm !== 'HS512' || candidate.state === 'revoked'
                || (candidate.state === 'verify-only' && Date.parse(candidate.verifyUntil) <= Date.now())) continue
            await loader.load({ environment: this.environment, purpose: other.purpose, kid: candidate.kid,
                algorithm: other.algorithm, material: candidate.material }, candidate, other.legacy?.kid === candidate.kid)
        }
        const material = await loader.load({ environment: this.environment,
            purpose: domain.purpose, kid: key.kid, algorithm: domain.algorithm, material: key.material }, key, false)
        if (material.algorithm === 'RS256' && !material.privateKey) throw new JwtKeyRegistryError('UNAVAILABLE')
    }
}
