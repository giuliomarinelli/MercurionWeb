import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { generateKeyPairSync, randomBytes, randomUUID, type UUID } from 'node:crypto'
import { Environment } from 'src/config/config.schema'
import { TokenType } from '../models/enums/token-type.enum'
import { JwtToolsService } from '../services/jwt-tools.service'
import { JwtKeyRing } from './jwt-key-ring'
import { jwtKeyAlgorithms } from './jwt-key-manifest'
import type { JwtKeyMaterial } from './jwt-key-material-source.port'
import { JwtKeyMaterialSourceError } from './jwt-key-material-source.port'
import { JwtKeyRuntimeError } from './jwt-key-runtime-error'
import { JWT_KEY_RUNTIME_OPTIONS, JwtKeyRuntimeModule } from './jwt-key-runtime.module'

jest.mock('../services/password-encoder.service', () => ({ PasswordEncoderService: class {} }))

type Key = {
    kid: string; material: { reference: string; version: string }; state: string; createdAt: string;
    activatedAt?: string; signingStoppedAt?: string; verifyUntil?: string; revokedAt?: string; publicKeyPem?: string
}
type Domain = {
    purpose: TokenType; algorithm: 'RS256' | 'HS512'; issuance: string; activeKid: string | null; keys: Key[];
    legacy?: { kid: string; acceptUntil: string; refreshUntil?: string }
}
const instant = (ms: number) => new Date(ms).toISOString()
const userId = '11111111-1111-4111-8111-111111111111' as UUID
const sessionId = '22222222-2222-4222-8222-222222222222' as UUID

describe('JWT multi-key runtime with real synthetic signatures', () => {
    let http: { publicKey: string; privateKey: string }
    let ws: typeof http
    let nextHttp: typeof http
    const rings = new Set<JwtKeyRing>()
    beforeAll(() => {
        const pair = () => generateKeyPairSync('rsa', { modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } })
        http = pair(); ws = pair(); nextHttp = pair()
    })
    afterEach(() => { for (const ring of rings) ring.close(); rings.clear(); jest.useRealTimers() })

    function fixture(environment = Environment.Test) {
        const now = Date.now()
        const materials = new Map<string, JwtKeyMaterial>()
        const manifest = {
            schemaVersion: 1, environment, revision: 1, previousRevision: null as number | null, updatedAt: instant(now),
            lastOperation: { kind: 'initialize', operator: 'synthetic-operator', reason: 'Synthetic test' },
            domains: Object.values(TokenType).map((purpose): Domain => {
                const pair = purpose === TokenType.AccessToken ? http : ws
                const algorithm = jwtKeyAlgorithms[purpose]
                materials.set(purpose, algorithm === 'RS256' ? { algorithm, encoding: 'pem', ...pair }
                    : { algorithm, encoding: 'base64', secret: randomBytes(64).toString('base64') })
                return { purpose, algorithm, issuance: 'enabled', activeKid: `${purpose}-v1`, keys: [{
                    kid: `${purpose}-v1`, material: { reference: purpose, version: 'v1' }, state: 'active',
                    createdAt: instant(now - 20000), activatedAt: instant(now - 10000),
                    ...(algorithm === 'RS256' ? { publicKeyPem: pair.publicKey } : {})
                }] }
            })
        }
        const read = jest.fn(async (): Promise<unknown> => JSON.parse(JSON.stringify(manifest)))
        const resolve = jest.fn(async (request: { material: { reference: string } }): Promise<JwtKeyMaterial> => {
            const result = materials.get(request.material.reference)
            if (!result) throw new JwtKeyMaterialSourceError('NOT_FOUND')
            return result
        })
        const options = { manifestSource: { read }, materialSource: { resolve } }
        const jwt = new JwtService()
        const ring = new JwtKeyRing(options, environment, jwt)
        rings.add(ring)
        const domain = (purpose: TokenType) => manifest.domains.find(entry => entry.purpose === purpose)!
        const bump = () => { manifest.previousRevision = manifest.revision++; manifest.lastOperation.kind = 'revoke'; manifest.updatedAt = instant(Date.now()) }
        return { manifest, materials, read, resolve, options, jwt, ring, domain, bump }
    }
    function claims(purpose: TokenType) {
        return { iss: 'issuer', aud: purpose === TokenType.AccessToken ? 'access' : purpose === TokenType.ws_AccessToken ? 'ws' : 'auth',
            sub: 'opaque-sub', jti: randomUUID(), sid: sessionId, typ: purpose, iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 60, scp: '' }
    }
    const verification = (purpose: TokenType, ignoreExpiration = false) => ({ issuer: 'issuer',
        audience: purpose === TokenType.AccessToken ? 'access' : purpose === TokenType.ws_AccessToken ? 'ws' : 'auth',
        clockTolerance: 60, ignoreExpiration })
    async function rawSign(f: ReturnType<typeof fixture>, purpose: TokenType, payload: object = claims(purpose), kid?: string, noTimestamp = false) {
        const material = f.materials.get(purpose)!
        return material.algorithm === 'RS256'
            ? f.jwt.signAsync(payload, { algorithm: 'RS256', privateKey: http.privateKey, noTimestamp, ...(kid === undefined ? {} : { keyid: kid }) })
            : f.jwt.signAsync(payload, { algorithm: 'HS512', secret: material.encoding === 'base64' ? Buffer.from(material.secret, 'base64') : material.secret,
                noTimestamp, ...(kid === undefined ? {} : { keyid: kid }) })
    }

    it.each(Object.values(TokenType))('signs/verifies %s using only its admitted kid and algorithm', async purpose => {
        const f = fixture()
        const payload = claims(purpose)
        const token = await f.ring.sign(payload, purpose)
        expect(f.jwt.decode(token, { complete: true })).toMatchObject({ header: { kid: `${purpose}-v1`, alg: jwtKeyAlgorithms[purpose] } })
        await expect(f.ring.verify(token, purpose, verification(purpose))).resolves.toMatchObject(payload)
    })

    it('keeps HTTP/WS and HMAC purposes mutually exclusive', async () => {
        const f = fixture()
        const httpToken = await f.ring.sign(claims(TokenType.AccessToken), TokenType.AccessToken)
        const hsToken = await f.ring.sign(claims(TokenType.ActivationToken), TokenType.ActivationToken)
        await expect(f.ring.verify(httpToken, TokenType.ws_AccessToken, verification(TokenType.ws_AccessToken))).rejects.toThrow()
        await expect(f.ring.verify(hsToken, TokenType.ChangePasswordToken, verification(TokenType.ChangePasswordToken))).rejects.toThrow()
        await expect(f.ring.verify(httpToken, TokenType.ActivationToken, verification(TokenType.ActivationToken))).rejects.toThrow()
    })

    it.each(['unknown', '../../key.pem', 'https://attacker.test/key', ''])('rejects kid %j before any material lookup', async kid => {
        const f = fixture()
        const purpose = TokenType.ActivationToken
        const token = await rawSign(f, purpose, claims(purpose), kid)
        await expect(f.ring.verify(token, purpose, verification(purpose))).rejects.toThrow(JwtKeyRuntimeError)
        expect(f.resolve).not.toHaveBeenCalled()
    })

    it('does not consult private material to verify RSA signatures', async () => {
        const f = fixture()
        const token = await rawSign(f, TokenType.AccessToken, claims(TokenType.AccessToken), 'AccessToken-v1')
        f.resolve.mockRejectedValue(new Error('Synthetic provider outage with confidential body'))
        await expect(f.ring.verify(token, TokenType.AccessToken, verification(TokenType.AccessToken))).resolves.toMatchObject({ typ: TokenType.AccessToken })
        expect(f.resolve).not.toHaveBeenCalled()
    })

    it('rejects incorrect issuer/audience, signature and absent required claims', async () => {
        const f = fixture()
        for (const change of [{ iss: 'other' }, { aud: 'other' }, { exp: undefined }, { iat: undefined }, { jti: 'not-a-uuid' }, { sid: 'not-a-uuid' }, { typ: TokenType.ws_AccessToken }]) {
            const payload = Object.fromEntries(Object.entries({ ...claims(TokenType.AccessToken), ...change }).filter(([, value]) => value !== undefined))
            const token = await rawSign(f, TokenType.AccessToken, payload, 'AccessToken-v1', 'iat' in change)
            await expect(f.ring.verify(token, TokenType.AccessToken, verification(TokenType.AccessToken))).rejects.toThrow()
        }
        const token = await f.jwt.signAsync(claims(TokenType.AccessToken), { algorithm: 'RS256', privateKey: ws.privateKey, keyid: 'AccessToken-v1' })
        await expect(f.ring.verify(token, TokenType.AccessToken, verification(TokenType.AccessToken))).rejects.toThrow()
    })

    it('allows expired HTTP signatures only for explicit renewal while retaining the key deadline', async () => {
        const f = fixture()
        const domain = f.domain(TokenType.AccessToken)
        const token = await rawSign(f, TokenType.AccessToken, { ...claims(TokenType.AccessToken), iat: Math.floor(Date.now() / 1000) - 200, exp: Math.floor(Date.now() / 1000) - 120 }, domain.activeKid!)
        await expect(f.ring.verify(token, TokenType.AccessToken, verification(TokenType.AccessToken))).rejects.toThrow()
        await expect(f.ring.verify(token, TokenType.AccessToken, verification(TokenType.AccessToken, true))).resolves.toMatchObject({ typ: TokenType.AccessToken })
        f.bump()
        domain.issuance = 'suspended'; domain.activeKid = null
        Object.assign(domain.keys[0], { state: 'verify-only', signingStoppedAt: instant(Date.now() - 1000), verifyUntil: instant(Date.now() - 1) })
        await expect(f.ring.verify(token, TokenType.AccessToken, verification(TokenType.AccessToken, true))).rejects.toThrow()
    })

    it('supports only the explicitly mapped legacy key and separate HTTP acceptance/renewal windows', async () => {
        const f = fixture()
        const domain = f.domain(TokenType.AccessToken)
        domain.legacy = { kid: domain.activeKid!, acceptUntil: instant(Date.now() - 1000), refreshUntil: instant(Date.now() + 60000) }
        const token = await rawSign(f, TokenType.AccessToken)
        await expect(f.ring.verify(token, TokenType.AccessToken, verification(TokenType.AccessToken))).rejects.toThrow()
        await expect(f.ring.verify(token, TokenType.AccessToken, verification(TokenType.AccessToken, true))).resolves.toMatchObject({ typ: TokenType.AccessToken })
        const unknown = await rawSign(f, TokenType.AccessToken, claims(TokenType.AccessToken), 'unknown')
        await expect(f.ring.verify(unknown, TokenType.AccessToken, verification(TokenType.AccessToken, true))).rejects.toThrow()
        f.bump(); domain.legacy.refreshUntil = instant(Date.now() - 1)
        await expect(f.ring.verify(token, TokenType.AccessToken, verification(TokenType.AccessToken, true))).rejects.toThrow()
    })

    it('requires an explicit mapping for tokens without kid', async () => {
        const f = fixture()
        const token = await rawSign(f, TokenType.AccessToken)
        await expect(f.ring.verify(token, TokenType.AccessToken, verification(TokenType.AccessToken))).rejects.toThrow()
    })

    it('preserves literal UTF-8 legacy HMAC bytes, with no Base64 reinterpretation', async () => {
        const f = fixture()
        const purpose = TokenType.PreAuthorizationToken
        f.domain(purpose).legacy = { kid: `${purpose}-v1`, acceptUntil: instant(Date.now() + 60000) }
        f.materials.set(purpose, { algorithm: 'HS512', encoding: 'utf8', secret: 'é'.repeat(48) })
        const token = await rawSign(f, purpose)
        await expect(f.ring.verify(token, purpose, verification(purpose))).resolves.toMatchObject({ typ: purpose })
    })

    it('retains verification of old RSA tokens after activating a distinct new key', async () => {
        const f = fixture()
        const purpose = TokenType.AccessToken
        const old = await f.ring.sign(claims(purpose), purpose)
        f.bump()
        const domain = f.domain(purpose)
        Object.assign(domain.keys[0], { state: 'verify-only', signingStoppedAt: f.manifest.updatedAt, verifyUntil: instant(Date.now() + 86400000) })
        domain.keys.push({ kid: 'http-v2', material: { reference: 'http-v2', version: 'v2' }, state: 'active', createdAt: f.manifest.updatedAt,
            activatedAt: f.manifest.updatedAt, publicKeyPem: nextHttp.publicKey })
        domain.activeKid = 'http-v2'
        f.materials.set('http-v2', { algorithm: 'RS256', encoding: 'pem', ...nextHttp })
        const current = await f.ring.sign(claims(purpose), purpose)
        expect(f.jwt.decode(current, { complete: true })).toMatchObject({ header: { kid: 'http-v2' } })
        await expect(f.ring.verify(old, purpose, verification(purpose))).resolves.toMatchObject({ typ: purpose })
        await expect(f.ring.verify(current, purpose, verification(purpose))).resolves.toMatchObject({ typ: purpose })
    })

    it('checks cached HMAC against fresh revocation and never signs with a revoked active key', async () => {
        const f = fixture()
        const purpose = TokenType.ActivationToken
        const token = await f.ring.sign(claims(purpose), purpose)
        await f.ring.verify(token, purpose, verification(purpose))
        expect(f.resolve).toHaveBeenCalledTimes(1)
        f.bump()
        const domain = f.domain(purpose)
        domain.issuance = 'suspended'; domain.activeKid = null
        Object.assign(domain.keys[0], { state: 'revoked', revokedAt: f.manifest.updatedAt })
        await expect(f.ring.verify(token, purpose, verification(purpose, true))).rejects.toThrow()
        await expect(f.ring.sign(claims(purpose), purpose)).rejects.toThrow()
    })

    it('does not return a token when a key is revoked during material resolution', async () => {
        const f = fixture()
        f.resolve.mockImplementationOnce(async () => {
            f.bump(); const domain = f.domain(TokenType.AccessToken)
            domain.issuance = 'suspended'; domain.activeKid = null
            Object.assign(domain.keys[0], { state: 'revoked', revokedAt: f.manifest.updatedAt })
            return { algorithm: 'RS256', encoding: 'pem', ...http }
        })
        await expect(f.ring.sign(claims(TokenType.AccessToken), TokenType.AccessToken)).rejects.toThrow()
    })

    it('rejects rollback, same-revision edits and reuse of an observed kid with different material', async () => {
        for (const change of ['rollback', 'same-revision', 'material'] as const) {
            const f = fixture()
            await f.ring.sign(claims(TokenType.AccessToken), TokenType.AccessToken)
            if (change === 'same-revision') f.manifest.lastOperation.reason = 'Changed without revision'
            else {
                f.bump()
                if (change === 'material') f.domain(TokenType.AccessToken).keys[0].material.version = 'replaced-under-same-kid'
                else { f.manifest.revision = 1; f.manifest.previousRevision = null; f.manifest.lastOperation.kind = 'initialize'; f.manifest.lastOperation.reason = 'Rollback to modified revision' }
            }
            await expect(f.ring.sign(claims(TokenType.AccessToken), TokenType.AccessToken)).rejects.toMatchObject({ operational: true })
        }
    })

    it('does not revive an observed revoked kid in a later revision', async () => {
        const f = fixture(); const purpose = TokenType.ActivationToken
        const token = await f.ring.sign(claims(purpose), purpose)
        f.bump(); const domain = f.domain(purpose)
        domain.issuance = 'suspended'; domain.activeKid = null
        Object.assign(domain.keys[0], { state: 'revoked', revokedAt: f.manifest.updatedAt })
        await expect(f.ring.verify(token, purpose, verification(purpose))).rejects.toThrow()
        f.bump(); domain.issuance = 'enabled'; domain.activeKid = domain.keys[0].kid
        domain.keys[0].state = 'active'; delete domain.keys[0].revokedAt
        await expect(f.ring.verify(token, purpose, verification(purpose))).rejects.toMatchObject({ operational: true })
    })

    it('rejects an actual revision rollback after admitting a higher revision', async () => {
        const f = fixture(); const original = JSON.stringify(f.manifest)
        await f.ring.sign(claims(TokenType.AccessToken), TokenType.AccessToken)
        f.bump()
        await f.ring.sign(claims(TokenType.AccessToken), TokenType.AccessToken)
        f.read.mockResolvedValue(JSON.parse(original))
        await expect(f.ring.sign(claims(TokenType.AccessToken), TokenType.AccessToken)).rejects.toMatchObject({ code: 'REGISTRY_UNAVAILABLE' })
    })

    it('rejects relabelling a retired RSA key under a new kid', async () => {
        const f = fixture(); const purpose = TokenType.AccessToken
        await f.ring.sign(claims(purpose), purpose)
        f.bump()
        const domain = f.domain(purpose)
        domain.keys[0].kid = 'relabeled-http'
        domain.keys[0].material = { reference: 'different-reference', version: 'v2' }
        domain.activeKid = 'relabeled-http'
        await expect(f.ring.sign(claims(purpose), purpose)).rejects.toMatchObject({ code: 'REGISTRY_UNAVAILABLE' })
    })

    it('rejects HMAC material reused across purposes despite distinct references', async () => {
        const f = fixture()
        f.materials.set(TokenType.ChangePasswordToken, f.materials.get(TokenType.ActivationToken)!)
        await f.ring.sign(claims(TokenType.ActivationToken), TokenType.ActivationToken)
        await expect(f.ring.sign(claims(TokenType.ChangePasswordToken), TokenType.ChangePasswordToken)).rejects.toMatchObject({ code: 'INVALID_MATERIAL' })
    })

    it('rechecks admission after signature verification instead of returning a revoked principal', async () => {
        const f = fixture(); const purpose = TokenType.AccessToken
        const token = await f.ring.sign(claims(purpose), purpose)
        const verify = f.jwt.verifyAsync.bind(f.jwt)
        jest.spyOn(f.jwt, 'verifyAsync').mockImplementationOnce(async (...args: Parameters<typeof verify>) => {
            const payload = await verify(...args)
            f.bump(); const domain = f.domain(purpose)
            domain.issuance = 'suspended'; domain.activeKid = null
            Object.assign(domain.keys[0], { state: 'revoked', revokedAt: f.manifest.updatedAt })
            return payload
        })
        await expect(f.ring.verify(token, purpose, verification(purpose))).rejects.toMatchObject({ code: 'KEY_NOT_ADMITTED' })
    })

    it.each(['mismatch', 'bad-base64', 'short-hmac', 'raw-new-hmac', 'wrong-algorithm', 'public-as-private'] as const)('rejects %s material without leaking provider values', async change => {
        const f = fixture()
        let purpose = TokenType.AccessToken
        if (change === 'mismatch') f.materials.set(purpose, { algorithm: 'RS256', encoding: 'pem', publicKey: http.publicKey, privateKey: ws.privateKey })
        if (change === 'bad-base64') f.materials.set(purpose, { algorithm: 'RS256', encoding: 'base64-pem', publicKey: 'private-provider-response!!!', privateKey: 'invalid' })
        if (change === 'public-as-private') f.materials.set(purpose, { algorithm: 'RS256', encoding: 'pem', publicKey: http.publicKey, privateKey: http.publicKey })
        if (change === 'wrong-algorithm') f.materials.set(purpose, { algorithm: 'HS512', encoding: 'base64', secret: randomBytes(64).toString('base64') })
        if (change === 'short-hmac' || change === 'raw-new-hmac') {
            purpose = TokenType.ActivationToken
            f.materials.set(purpose, change === 'short-hmac' ? { algorithm: 'HS512', encoding: 'base64', secret: randomBytes(48).toString('base64') }
                : { algorithm: 'HS512', encoding: 'utf8', secret: 'x'.repeat(64) })
        }
        await expect(f.ring.sign(claims(purpose), purpose)).rejects.toMatchObject({ code: 'INVALID_MATERIAL' })
        await expect(f.ring.sign(claims(purpose), purpose)).rejects.not.toThrow('private-provider-response')
    })

    it.each([Environment.Staging, Environment.Production])('accepts only in-memory Base64 RSA for %s', async environment => {
        const f = fixture(environment)
        await expect(f.ring.sign(claims(TokenType.AccessToken), TokenType.AccessToken)).rejects.toMatchObject({ code: 'INVALID_MATERIAL' })
        f.materials.set(TokenType.AccessToken, { algorithm: 'RS256', encoding: 'base64-pem',
            publicKey: Buffer.from(http.publicKey).toString('base64'), privateKey: Buffer.from(http.privateKey).toString('base64') })
        await expect(f.ring.sign(claims(TokenType.AccessToken), TokenType.AccessToken)).resolves.toEqual(expect.any(String))
    })

    it('shares concurrent material requests and keeps warm material available during manager outage', async () => {
        const f = fixture()
        await Promise.all([f.ring.sign(claims(TokenType.ActivationToken), TokenType.ActivationToken), f.ring.sign(claims(TokenType.ActivationToken), TokenType.ActivationToken)])
        expect(f.resolve).toHaveBeenCalledTimes(1)
        f.resolve.mockRejectedValue(new Error('private-provider-response'))
        await expect(f.ring.sign(claims(TokenType.ActivationToken), TokenType.ActivationToken)).resolves.toEqual(expect.any(String))
        await expect(f.ring.sign(claims(TokenType.ChangePasswordToken), TokenType.ChangePasswordToken)).rejects.toMatchObject({ code: 'MATERIAL_UNAVAILABLE' })
    })

    it('fails closed on unreadable/invalid metadata even with warm material', async () => {
        const f = fixture()
        await f.ring.sign(claims(TokenType.ActivationToken), TokenType.ActivationToken)
        f.read.mockRejectedValue(new Error('private-metadata-response'))
        await expect(f.ring.sign(claims(TokenType.ActivationToken), TokenType.ActivationToken)).rejects.toMatchObject({ code: 'REGISTRY_UNAVAILABLE' })
    })

    it('bounds a hung manifest operation and a hung material operation', async () => {
        jest.useFakeTimers()
        const f = fixture()
        f.read.mockImplementationOnce(() => new Promise(() => undefined))
        const manifestFailure = expect(f.ring.sign(claims(TokenType.AccessToken), TokenType.AccessToken)).rejects.toMatchObject({ code: 'REGISTRY_UNAVAILABLE' })
        await jest.advanceTimersByTimeAsync(1000); await manifestFailure
        f.resolve.mockImplementationOnce(() => new Promise(() => undefined))
        const materialFailure = expect(f.ring.sign(claims(TokenType.AccessToken), TokenType.AccessToken)).rejects.toMatchObject({ code: 'MATERIAL_UNAVAILABLE' })
        await jest.advanceTimersByTimeAsync(5000); await materialFailure
        expect(jest.getTimerCount()).toBe(0)
    })

    it('registers runtime sources only through explicit, complete composition', async () => {
        const f = fixture()
        const module = await Test.createTestingModule({ imports: [JwtKeyRuntimeModule.register(f.options)] }).compile()
        expect(module.get(JWT_KEY_RUNTIME_OPTIONS)).toEqual(f.options)
        await module.close()
        expect(() => JwtKeyRuntimeModule.register({ ...f.options, materialSource: undefined } as never)).toThrow()
    })

    function tools(f: ReturnType<typeof fixture>) {
        const session = { registerIssuedToken: jest.fn().mockResolvedValue(undefined), isTokenRevoked: jest.fn().mockResolvedValue(false) }
        const redis = { get: jest.fn().mockResolvedValue(null) }
        const legacy = { getAccessKeyPair: jest.fn(() => { throw new Error('Legacy material must not be read') }), getWsKeyPair: jest.fn(() => { throw new Error('Legacy material must not be read') }) }
        const config = { getOrThrow: () => Environment.Test, get: (key: string) => {
            if (key === 'Jwt.issuer') return 'issuer'
            if (key === 'Jwt.audience') return { access: 'access', ws: 'ws', auth: 'auth' }
            if (key === 'Session.sessionZeroId') return sessionId
            if (key.endsWith('expiresInMs')) return 60000
            if (key.startsWith('Jwt.')) return { expiresInMs: 60000 }
            return undefined
        } }
        const service = new JwtToolsService(f.jwt, config as unknown as ConfigService,
            { getUserScopesById: jest.fn().mockResolvedValue([]) }, session as never,
            { forContext: () => ({ warn: jest.fn() }) } as never, legacy as never,
            { encryptUserId: () => 'opaque-sub', decryptUserId: () => userId } as never, redis as never, f.options)
        return { service, session, redis, legacy }
    }

    it.each(Object.values(TokenType))('integrates %s with JTI registration and existing application claims', async purpose => {
        const f = fixture(); const { service, session, redis, legacy } = tools(f)
        const token = await service.generateToken(userId, purpose, sessionId)
        const decoded = f.jwt.decode<{ jti: string }>(token)
        redis.get.mockResolvedValue(decoded.jti)
        await expect(service.verifyTokenAndGetPayload(token, purpose)).resolves.toMatchObject({ typ: purpose, sub: 'opaque-sub', jti: decoded.jti })
        expect(session.registerIssuedToken).toHaveBeenCalledWith(sessionId, decoded.jti, 60)
        expect(legacy.getAccessKeyPair).not.toHaveBeenCalled()
        expect(legacy.getWsKeyPair).not.toHaveBeenCalled()
    })

    it('preserves JTI/PAT checks and never bypasses key revocation with diagnostic flags', async () => {
        const f = fixture(); const { service, session, redis } = tools(f); const purpose = TokenType.PreAuthorizationToken
        const token = await service.generateToken(userId, purpose, sessionId)
        const payload = f.jwt.decode<{ jti: string }>(token)
        redis.get.mockResolvedValue(payload.jti)
        session.isTokenRevoked.mockResolvedValue(true)
        await expect(service.verifyTokenAndGetPayload(token, purpose)).rejects.toThrow()
        session.isTokenRevoked.mockResolvedValue(false); redis.get.mockResolvedValue('replacement')
        await expect(service.verifyTokenAndGetPayload(token, purpose)).rejects.toThrow()
        await expect(service.verifyTokenAndGetPayload(token, purpose, false, true)).resolves.toMatchObject({ jti: payload.jti })
        f.bump(); const domain = f.domain(purpose); domain.issuance = 'suspended'; domain.activeKid = null
        Object.assign(domain.keys[0], { state: 'revoked', revokedAt: f.manifest.updatedAt })
        await expect(service.verifyTokenAndGetPayload(token, purpose, true, true)).rejects.toThrow()
    })

    it('propagates source faults without trying legacy keys or registering a token', async () => {
        const f = fixture(); const { service, session, legacy } = tools(f)
        f.resolve.mockRejectedValue(new Error('private-provider-response'))
        await expect(service.generateToken(userId, TokenType.AccessToken, sessionId)).rejects.toMatchObject({ operational: true })
        expect(legacy.getAccessKeyPair).not.toHaveBeenCalled()
        expect(session.registerIssuedToken).not.toHaveBeenCalled()
    })

    it('validates and warms configured material during Nest initialization', async () => {
        const f = fixture(); const { service, legacy } = tools(f)
        await service.onModuleInit()
        expect(f.resolve).toHaveBeenCalledTimes(Object.values(TokenType).length)
        f.resolve.mockRejectedValue(new Error('Synthetic outage'))
        await expect(service.generateToken(userId, TokenType.ActivationToken, sessionId)).resolves.toEqual(expect.any(String))
        expect(legacy.getAccessKeyPair).not.toHaveBeenCalled()
    })

    it('refuses initialization without usable material and never falls back', async () => {
        const f = fixture(); const { service, legacy } = tools(f)
        f.materials.set(TokenType.AccessToken, { algorithm: 'RS256', encoding: 'pem', publicKey: http.publicKey })
        await expect(service.onModuleInit()).rejects.toMatchObject({ code: 'INVALID_MATERIAL' })
        expect(legacy.getAccessKeyPair).not.toHaveBeenCalled()
    })

    it('evicts idle connections on key revocation within five seconds without consulting material', async () => {
        const f = fixture(); const purpose = TokenType.ws_AccessToken
        const token = await f.ring.sign(claims(purpose), purpose)
        jest.useFakeTimers()
        const deny = jest.fn()
        await f.ring.watchVerifiedConnection('socket-a', token, deny)
        f.resolve.mockClear().mockRejectedValue(new Error('Manager offline'))
        f.bump(); const domain = f.domain(purpose)
        domain.issuance = 'suspended'; domain.activeKid = null
        Object.assign(domain.keys[0], { state: 'revoked', revokedAt: f.manifest.updatedAt })
        await jest.advanceTimersByTimeAsync(1000)
        expect(deny).toHaveBeenCalledTimes(1)
        expect(f.resolve).not.toHaveBeenCalled()
        expect(jest.getTimerCount()).toBe(0)
    })

    it('preserves connected sockets through ordinary rotation and expired JWT lifetime', async () => {
        const f = fixture(); const purpose = TokenType.ws_AccessToken
        const token = await f.ring.sign({ ...claims(purpose), iat: Math.floor(Date.now() / 1000) - 200, exp: Math.floor(Date.now() / 1000) - 100 }, purpose)
        jest.useFakeTimers()
        const deny = jest.fn(); const release = await f.ring.watchVerifiedConnection('socket-a', token, deny)
        f.bump(); const domain = f.domain(purpose)
        domain.keys[0].state = 'verify-only'; domain.issuance = 'suspended'; domain.activeKid = null
        Object.assign(domain.keys[0], { signingStoppedAt: f.manifest.updatedAt, verifyUntil: new Date(Date.now() + 60000).toISOString() })
        await jest.advanceTimersByTimeAsync(4000)
        expect(deny).not.toHaveBeenCalled()
        release()
        expect(jest.getTimerCount()).toBe(0)
    })

    it('fails closed for idle private sockets during a hung registry read, independently per socket', async () => {
        const f = fixture(); const purpose = TokenType.ws_AccessToken
        const token = await f.ring.sign(claims(purpose), purpose)
        jest.useFakeTimers()
        const deny = jest.fn(); const broken = jest.fn(() => { throw new Error('Socket callback failure') })
        await f.ring.watchVerifiedConnection('broken', token, broken)
        await f.ring.watchVerifiedConnection('healthy', token, deny)
        f.read.mockImplementation(() => new Promise(() => undefined))
        await jest.advanceTimersByTimeAsync(4000)
        expect(deny).toHaveBeenCalledTimes(1); expect(broken).toHaveBeenCalledTimes(1)
        expect(jest.getTimerCount()).toBe(0)
    })

    it('does not evict a freshly rebound connection based on a previous read snapshot', async () => {
        const f = fixture(); const purpose = TokenType.ws_AccessToken
        const token = await f.ring.sign(claims(purpose), purpose)
        jest.useFakeTimers()
        const oldDeny = jest.fn(); const nextDeny = jest.fn()
        const release = await f.ring.watchVerifiedConnection('socket-a', token, oldDeny)
        let complete!: (value: unknown) => void
        f.read.mockImplementationOnce(() => new Promise(resolve => { complete = resolve }))
        await jest.advanceTimersByTimeAsync(1000)
        await f.ring.watchVerifiedConnection('socket-a', token, nextDeny)
        release()
        complete(JSON.parse(JSON.stringify(f.manifest)))
        await jest.advanceTimersByTimeAsync(1)
        expect(oldDeny).not.toHaveBeenCalled(); expect(nextDeny).not.toHaveBeenCalled()
    })

    it('tolerates a single interrupted metadata publication without disconnecting valid sockets', async () => {
        const f = fixture(); const purpose = TokenType.ws_AccessToken
        const token = await f.ring.sign(claims(purpose), purpose)
        jest.useFakeTimers()
        const deny = jest.fn()
        await f.ring.watchVerifiedConnection('socket-a', token, deny)
        f.read.mockRejectedValueOnce(new Error('Publication interrupted'))
        await jest.advanceTimersByTimeAsync(1500)
        expect(deny).not.toHaveBeenCalled()
    })
})
