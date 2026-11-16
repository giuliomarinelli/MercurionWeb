import { generateKeyPairSync } from 'node:crypto'
import { Environment } from 'src/config/config.schema'
import { TokenType } from '../models/enums/token-type.enum'
import { jwtKeyAlgorithms } from './jwt-key-manifest'
import { JwtKeyManifestValidationError, parseJwtKeyManifest } from './jwt-key-manifest.parser'

type FixtureKey = {
    kid: string
    material: { reference: string; version: string }
    createdAt: string
    state: string
    activatedAt?: string
    signingStoppedAt?: string
    verifyUntil?: string
    revokedAt?: string
    publicKeyPem?: string
}
type FixtureDomain = {
    purpose: string
    algorithm: string
    issuance: string
    activeKid: string | null
    keys: FixtureKey[]
    legacy?: { kid: string; acceptUntil: string; refreshUntil?: string }
}

describe('JWT key manifest v1 boundary', () => {
    let rsaPublicKey: string
    let rsaPrivateKey: string
    let wsPublicKey: string
    let rotatedPublicKey: string
    const createdAt = '2026-10-01T00:00:00.000Z'
    const activatedAt = '2026-10-02T00:00:00.000Z'
    const updatedAt = '2026-10-25T00:00:00.000Z'
    const cutoff = '2026-10-24T00:00:00.000Z'
    const deadline = '2026-11-25T00:00:00.000Z'

    beforeAll(() => {
        const pair = generateKeyPairSync('rsa', { modulusLength: 2048 })
        rsaPublicKey = pair.publicKey.export({ format: 'pem', type: 'spki' }).toString()
        rsaPrivateKey = pair.privateKey.export({ format: 'pem', type: 'pkcs8' }).toString()
        wsPublicKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ format: 'pem', type: 'spki' }).toString()
        rotatedPublicKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ format: 'pem', type: 'spki' }).toString()
    })

    function fixture() {
        return {
            schemaVersion: 1,
            environment: Environment.Test,
            revision: 1,
            previousRevision: null as number | null,
            updatedAt,
            lastOperation: { kind: 'initialize', operator: 'synthetic-operator', reason: 'Synthetic initialization' },
            domains: Object.values(TokenType).map((purpose): FixtureDomain => ({
                purpose,
                algorithm: jwtKeyAlgorithms[purpose],
                issuance: 'enabled',
                activeKid: `${purpose}-v1`,
                keys: [{
                    kid: `${purpose}-v1`, material: { reference: `synthetic-${purpose}`, version: 'v1' },
                    createdAt, state: 'active', activatedAt,
                    ...(jwtKeyAlgorithms[purpose] === 'RS256' ? { publicKeyPem: purpose === TokenType.AccessToken ? rsaPublicKey : wsPublicKey } : {})
                }]
            }))
        }
    }

    function rotated() {
        const manifest = fixture()
        manifest.revision = 2
        manifest.previousRevision = 1
        manifest.lastOperation.kind = 'activate'
        const domain = manifest.domains[0]
        Object.assign(domain.keys[0], { state: 'verify-only', signingStoppedAt: cutoff, verifyUntil: deadline })
        domain.keys.push({ ...domain.keys[0], kid: 'http-v2', material: { reference: 'synthetic-http-v2', version: 'v2' }, state: 'active',
            publicKeyPem: rotatedPublicKey, activatedAt: cutoff, signingStoppedAt: undefined, verifyUntil: undefined })
        domain.activeKid = 'http-v2'
        domain.legacy = { kid: domain.keys[0].kid, acceptUntil: updatedAt, refreshUntil: deadline }
        return manifest
    }

    it('covers all 15 purposes with separate HTTP/WS RSA and thirteen HMAC domains', () => {
        expect(Object.keys(jwtKeyAlgorithms).sort()).toEqual(Object.values(TokenType).sort())
        const parsed = parseJwtKeyManifest(fixture(), Environment.Test)
        expect(parsed.domains).toHaveLength(15)
        expect(parsed.domains.filter(domain => domain.algorithm === 'RS256').map(domain => domain.purpose))
            .toEqual([TokenType.AccessToken, TokenType.ws_AccessToken])
        expect(parsed.domains.filter(domain => domain.algorithm === 'HS512')).toHaveLength(13)
    })

    it('returns a detached, deeply immutable snapshot', () => {
        const input = rotated()
        const parsed = parseJwtKeyManifest(input, Environment.Test)
        input.domains[0].keys[0].material.version = 'changed-after-validation'
        expect(parsed.domains[0].keys[0].material.version).toBe('v1')
        for (const node of [parsed, parsed.lastOperation, parsed.domains, parsed.domains[0], parsed.domains[0].keys,
            parsed.domains[0].keys[0], parsed.domains[0].keys[0].material, parsed.domains[0].legacy]) {
            expect(Object.isFrozen(node)).toBe(true)
        }
    })

    it('admits old verification, new issuance and a bounded HTTP legacy renewal window', () => {
        const parsed = parseJwtKeyManifest(rotated(), Environment.Test)
        expect(parsed.domains[0].keys.map(key => key.state)).toEqual(['verify-only', 'active'])
        expect(parsed.domains[0].legacy?.refreshUntil).toBe(deadline)
    })

    it('allows prepared keys and distinct versions of a logical material reference', () => {
        const input = fixture()
        input.domains[2].keys.push({ ...input.domains[2].keys[0], kid: 'pat-v2', state: 'prepared', activatedAt: undefined,
            material: { reference: input.domains[2].keys[0].material.reference, version: 'v2' } })
        expect(parseJwtKeyManifest(input, Environment.Test).domains[2].keys[1].state).toBe('prepared')
    })

    it('represents revocation of the only active key without silently selecting a replacement', () => {
        const input = fixture()
        const http = input.domains[0]
        http.issuance = 'suspended'
        http.activeKid = null
        Object.assign(http.keys[0], { state: 'revoked', revokedAt: updatedAt })
        delete http.keys[0].publicKeyPem
        http.legacy = { kid: http.keys[0].kid, acceptUntil: deadline }
        const result = parseJwtKeyManifest(input, Environment.Test).domains[0]
        expect(result.activeKid).toBeNull()
        expect(result.keys[0].state).toBe('revoked')
        expect(result.legacy?.kid).toBe(result.keys[0].kid) // Mapping does not confer validity.
    })

    it('permits an explicitly suspended domain with no material provisioned yet', () => {
        const input = fixture()
        Object.assign(input.domains[2], { issuance: 'suspended', activeKid: null, keys: [] })
        expect(parseJwtKeyManifest(input, Environment.Test).domains[2].keys).toEqual([])
    })

    it.each(Object.values(Environment))('binds a manifest explicitly to %s', environment => {
        const input = fixture()
        input.environment = environment
        expect(parseJwtKeyManifest(input, environment).environment).toBe(environment)
    })

    const invalid: [string, (input: ReturnType<typeof fixture>) => void, string][] = [
        ['unknown schema', input => { input.schemaVersion = 2 }, 'INVALID_VALUE'],
        ['wrong environment', input => { input.environment = Environment.Production }, 'ENVIRONMENT_MISMATCH'],
        ['unsafe revision', input => { input.revision = Number.MAX_SAFE_INTEGER + 1 }, 'INVALID_VALUE'],
        ['fractional revision', input => { input.revision = 1.5 }, 'INVALID_VALUE'],
        ['zero revision', input => { input.revision = 0 }, 'INVALID_VALUE'],
        ['broken predecessor', input => { input.previousRevision = 0 }, 'INVALID_VALUE'],
        ['initialize after first revision', input => { input.revision = 2; input.previousRevision = 1 }, 'STATE_CONFLICT'],
        ['noninitial first operation', input => { input.lastOperation.kind = 'activate' }, 'STATE_CONFLICT'],
        ['missing operator', input => { input.lastOperation.operator = '' }, 'INVALID_VALUE'],
        ['empty reason', input => { input.lastOperation.reason = '  ' }, 'INVALID_VALUE'],
        ['unknown root field', input => { Object.assign(input, { secrets: 'never-echo-this' }) }, 'UNKNOWN_FIELD'],
        ['unknown operation field', input => { Object.assign(input.lastOperation, { token: 'never-echo-this' }) }, 'UNKNOWN_FIELD'],
        ['missing purpose', input => { input.domains.pop() }, 'DOMAIN_SET_INVALID'],
        ['extra purpose', input => { input.domains.push(input.domains[0]) }, 'DOMAIN_SET_INVALID'],
        ['duplicate purpose', input => { input.domains[1].purpose = input.domains[0].purpose }, 'DUPLICATE'],
        ['unknown purpose', input => { input.domains[0].purpose = 'UnknownToken' }, 'INVALID_VALUE'],
        ['HTTP HMAC confusion', input => { input.domains[0].algorithm = 'HS512' }, 'ALGORITHM_MISMATCH'],
        ['HMAC RSA confusion', input => { input.domains[2].algorithm = 'RS256' }, 'ALGORITHM_MISMATCH'],
        ['unsupported algorithm', input => { input.domains[0].algorithm = 'none' }, 'ALGORITHM_MISMATCH'],
        ['unknown domain field', input => { Object.assign(input.domains[0], { secret: 'never-echo-this' }) }, 'UNKNOWN_FIELD'],
        ['duplicate kid across domains', input => { input.domains[1].keys[0].kid = input.domains[0].keys[0].kid }, 'DUPLICATE'],
        ['reused material/version across domains', input => { input.domains[1].keys[0].material = input.domains[0].keys[0].material }, 'DUPLICATE'],
        ['same RSA material under different HTTP/WS references', input => { input.domains[1].keys[0].publicKeyPem = rsaPublicKey }, 'DUPLICATE'],
        ['missing active key', input => { input.domains[0].activeKid = 'unknown' }, 'STATE_CONFLICT'],
        ['enabled without active', input => { input.domains[0].keys = [] }, 'STATE_CONFLICT'],
        ['multiple active keys', input => { input.domains[0].keys.push({ ...input.domains[0].keys[0], kid: 'extra', publicKeyPem: rotatedPublicKey, material: { reference: 'extra', version: 'v1' } }) }, 'STATE_CONFLICT'],
        ['suspension retaining active', input => { input.domains[0].issuance = 'suspended' }, 'STATE_CONFLICT'],
        ['unknown state', input => { input.domains[0].keys[0].state = 'retired' }, 'INVALID_VALUE'],
        ['missing activation date', input => { delete input.domains[0].keys[0].activatedAt }, 'INVALID_VALUE'],
        ['future activation', input => { input.domains[0].keys[0].activatedAt = deadline }, 'INVALID_TIME_ORDER'],
        ['creation after activation', input => { input.domains[0].keys[0].createdAt = cutoff }, 'INVALID_TIME_ORDER'],
        ['prepared with activation data', input => { input.domains[0].keys[0].state = 'prepared' }, 'STATE_CONFLICT'],
        ['active with revocation data', input => { input.domains[0].keys[0].revokedAt = updatedAt }, 'STATE_CONFLICT'],
        ['kid used as path', input => { input.domains[0].keys[0].kid = '../../private.pem' }, 'INVALID_VALUE'],
        ['kid used as URL', input => { input.domains[0].keys[0].kid = 'https://attacker.test/key' }, 'INVALID_VALUE'],
        ['oversized kid', input => { input.domains[0].keys[0].kid = 'k'.repeat(129) }, 'INVALID_VALUE'],
        ['reference used as path', input => { input.domains[0].keys[0].material.reference = '/run/secrets/key' }, 'INVALID_VALUE'],
        ['reference used as URI', input => { input.domains[0].keys[0].material.reference = 'https://provider.test/secret' }, 'INVALID_VALUE'],
        ['missing material version', input => { input.domains[0].keys[0].material.version = '' }, 'INVALID_VALUE'],
        ['inline secret in binding', input => { Object.assign(input.domains[0].keys[0].material, { secret: 'never-echo-this' }) }, 'UNKNOWN_FIELD'],
        ['private PEM in metadata field', input => { input.domains[0].keys[0].publicKeyPem = rsaPrivateKey }, 'INVALID_PUBLIC_KEY'],
        ['arbitrary public PEM', input => { input.domains[0].keys[0].publicKeyPem = '-----BEGIN PUBLIC KEY-----\nAAAA\n-----END PUBLIC KEY-----' }, 'INVALID_PUBLIC_KEY'],
        ['missing RSA public key', input => { delete input.domains[0].keys[0].publicKeyPem }, 'INVALID_PUBLIC_KEY'],
        ['HMAC inline material', input => { Object.assign(input.domains[2].keys[0], { secret: 'never-echo-this' }) }, 'UNKNOWN_FIELD'],
        ['HMAC with public-key field', input => { input.domains[2].keys[0].publicKeyPem = rsaPublicKey }, 'STATE_CONFLICT'],
        ['offset timestamp', input => { input.updatedAt = '2026-10-25T01:00:00.000+01:00' }, 'INVALID_VALUE'],
        ['invalid calendar date', input => { input.updatedAt = '2026-02-30T00:00:00.000Z' }, 'INVALID_VALUE'],
        ['unknown legacy key', input => { input.domains[0].legacy = { kid: 'unknown', acceptUntil: deadline } }, 'REFERENCE_MISSING'],
        ['WS legacy renewal override', input => { input.domains[1].legacy = { kid: input.domains[1].keys[0].kid, acceptUntil: updatedAt, refreshUntil: deadline } }, 'STATE_CONFLICT'],
        ['legacy renewal before acceptance', input => { input.domains[0].legacy = { kid: input.domains[0].keys[0].kid, acceptUntil: deadline, refreshUntil: updatedAt } }, 'INVALID_TIME_ORDER']
    ]

    it.each(invalid)('rejects %s without including input values in diagnostics', (_name, mutate, code) => {
        const input = fixture()
        mutate(input)
        let error: unknown
        try { parseJwtKeyManifest(input, Environment.Test) } catch (caught) { error = caught }
        expect(error).toBeInstanceOf(JwtKeyManifestValidationError)
        expect(error).toMatchObject({ code })
        expect(String(error)).not.toContain('never-echo-this')
        expect(String(error)).not.toContain(rsaPrivateKey)
    })

    it.each([null, [], 'not-decoded-json', 123, new Date()])('rejects nonrecord input %#', value => {
        expect(() => parseJwtKeyManifest(value, Environment.Test)).toThrow(JwtKeyManifestValidationError)
    })

    it('rejects getters instead of invoking arbitrary accessors', () => {
        const input = fixture()
        const getter = jest.fn(() => 1)
        Object.defineProperty(input, 'schemaVersion', { get: getter })
        expect(() => parseJwtKeyManifest(input, Environment.Test)).toThrow(JwtKeyManifestValidationError)
        expect(getter).not.toHaveBeenCalled()
    })

    it('rejects non-RSA and undersized RSA public keys', () => {
        const keys = [generateKeyPairSync('rsa', { modulusLength: 1024 }).publicKey,
            generateKeyPairSync('ec', { namedCurve: 'prime256v1' }).publicKey]
        for (const key of keys) {
            const input = fixture()
            input.domains[0].keys[0].publicKeyPem = key.export({ format: 'pem', type: 'spki' }).toString()
            expect(() => parseJwtKeyManifest(input, Environment.Test)).toThrow(JwtKeyManifestValidationError)
        }
    })

    it.each([
        ['missing stop time', (key: FixtureKey) => { delete key.signingStoppedAt }],
        ['missing deadline', (key: FixtureKey) => { delete key.verifyUntil }],
        ['stop before activation', (key: FixtureKey) => { key.signingStoppedAt = createdAt }],
        ['deadline before stop', (key: FixtureKey) => { key.verifyUntil = createdAt }]
    ])('rejects a verify-only key with %s', (_name, mutate) => {
        const input = rotated()
        ;(mutate as (key: FixtureKey) => void)(input.domains[0].keys[0])
        expect(() => parseJwtKeyManifest(input, Environment.Test)).toThrow(JwtKeyManifestValidationError)
    })

    it('rejects a legacy refresh window beyond the key verification deadline', () => {
        const input = rotated()
        input.domains[0].legacy!.refreshUntil = '2026-12-01T00:00:00.000Z'
        expect(() => parseJwtKeyManifest(input, Environment.Test)).toThrow(JwtKeyManifestValidationError)
    })

    it('keeps revoked verification history but rejects inconsistent revocation dates', () => {
        const input = rotated()
        const key = input.domains[0].keys[0]
        Object.assign(key, { state: 'revoked', revokedAt: updatedAt })
        expect(parseJwtKeyManifest(input, Environment.Test).domains[0].keys[0].state).toBe('revoked')
        key.revokedAt = createdAt
        expect(() => parseJwtKeyManifest(input, Environment.Test)).toThrow(JwtKeyManifestValidationError)
    })
})
