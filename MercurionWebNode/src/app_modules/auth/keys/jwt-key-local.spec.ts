import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import { generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto'
import { mkdtemp, readFile, rm, writeFile, lstat, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { Environment, legacyJwtSecretSources } from 'src/config/config.schema'
import { validateEnvironment } from 'src/config/env-validation'
import { buildTestEnvironment, createTestConfigurationModule } from 'src/test-utils/configuration'
import { JwtToolsService } from '../services/jwt-tools.service'
import { JwtKeysProvider } from '../providers/jwt-keys.provider'
import { SessionService } from '../services/session.service'
import { SecurityService } from '../services/security.service'
import { RedisService } from 'src/app_modules/redis/services/redis.service'
import { LoggerPort } from 'src/logging/logger.port'
import { IDENTITY_READ_PORT } from '../models/interfaces/identity-read.port'
import { TokenType } from '../models/enums/token-type.enum'
import { jwtKeyAlgorithms } from './jwt-key-manifest'
import { JwtKeyRing } from './jwt-key-ring'
import { JwtKeyAdministration } from './jwt-key-administration'
import { JwtKeyFileRegistry } from './jwt-key-registry'
import { generateLocalJwtKey, migrateLocalJwtKeys } from './jwt-key-local.setup'
import { createLocalJwtKeyRuntime, readLocalKeySettings } from './jwt-key-local.source'
import { JwtKeyRuntimeModule, JWT_KEY_RUNTIME_OPTIONS } from './jwt-key-runtime.module'
import { runJwtLocalCli } from 'src/jwt-local.cli'
import { runJwtKeysCli } from 'src/jwt-keys.cli'

jest.mock('../services/password-encoder.service', () => ({ PasswordEncoderService: class {} }))
const configurationName = (purpose: TokenType) => purpose === TokenType.ws_AccessToken ? 'ws_accessToken'
    : purpose === TokenType.SSO_PreAuthorizationToken ? 'sso_preAuthorizationToken' : purpose[0].toLowerCase() + purpose.slice(1)

describe('Local JWT setup, source and canonical bootstrap composition', () => {
    let http: { publicKey: string; privateKey: string }, ws: typeof http
    let directory: string, target: string, config: ConfigService, at: string
    beforeAll(() => {
        const pair = () => generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } })
        http = pair(); ws = pair()
    })
    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'mercurion-jwt-local-')); target = join(directory, 'store')
        at = new Date().toISOString()
        config = new ConfigService({ App: { env: Environment.Test }, Session: { shortSessionLasting: 120, persistentSessionLasting: 600 },
            Jwt: Object.fromEntries(Object.values(TokenType).map(purpose => [configurationName(purpose), { expiresInMs: 120000,
                secret: purpose === TokenType.ActivationToken ? randomBytes(64).toString('base64') : `${purpose}-${'é'.repeat(48)}` }])) })
    })
    afterEach(async () => {
        jest.restoreAllMocks()
        const path = resolve(directory)
        if (dirname(path) !== resolve(tmpdir()) || !path.includes('mercurion-jwt-local-')) throw new Error('Unsafe cleanup')
        await rm(path, { recursive: true, force: true })
    })
    const input = () => ({ config, http, ws, directory: target, at })
    async function initialize() {
        const preview = await migrateLocalJwtKeys(input())
        await migrateLocalJwtKeys(input(), preview.digest)
        return join(target, 'settings.json')
    }
    function claims(purpose: TokenType) {
        return { iss: 'issuer', aud: purpose === TokenType.AccessToken ? 'access' : purpose === TokenType.ws_AccessToken ? 'ws' : 'auth',
            sub: 'opaque-test-sub', sid: '11111111-1111-4111-8111-111111111111', jti: randomUUID(), typ: purpose, scp: '',
            iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 120 }
    }
    const verification = (purpose: TokenType) => ({ issuer: 'issuer', audience: purpose === TokenType.AccessToken ? 'access' : purpose === TokenType.ws_AccessToken ? 'ws' : 'auth' })

    it('previews without files or sensitive output and applies only the approved plan', async () => {
        const preview = await migrateLocalJwtKeys(input())
        await expect(lstat(target)).rejects.toMatchObject({ code: 'ENOENT' })
        expect(JSON.stringify(preview)).not.toContain(http.privateKey)
        expect(JSON.stringify(preview)).not.toContain(config.get('Jwt.activationToken.secret'))
        await expect(migrateLocalJwtKeys(input(), 'wrong-digest')).rejects.toMatchObject({ code: 'CONFLICT' })
        await migrateLocalJwtKeys(input(), preview.digest)
        await expect(migrateLocalJwtKeys(input(), preview.digest)).rejects.toMatchObject({ code: 'CONFLICT' })
        expect((await readLocalKeySettings(join(target, 'settings.json'), Environment.Test)).bindings).toHaveLength(15)
        expect(preview.windows.find(domain => domain.purpose === TokenType.AccessToken)?.refreshUntil).toBe(new Date(Date.parse(at) + 660000).toISOString())
    })

    it.each(Object.values(TokenType))('migrates %s without changing legacy signing bytes, and emits kid', async purpose => {
        const path = await initialize(), runtime = await createLocalJwtKeyRuntime(path, Environment.Test), jwt = new JwtService()
        const ring = new JwtKeyRing(runtime, Environment.Test, jwt)
        try {
            await ring.initialize()
            const payload = claims(purpose)
            const legacy = jwtKeyAlgorithms[purpose] === 'RS256'
                ? await jwt.signAsync(payload, { algorithm: 'RS256', privateKey: purpose === TokenType.AccessToken ? http.privateKey : ws.privateKey })
                : await jwt.signAsync(payload, { algorithm: 'HS512', secret: config.get<string>(`Jwt.${configurationName(purpose)}.secret`)! })
            await expect(ring.verify(legacy, purpose, verification(purpose))).resolves.toMatchObject(payload)
            const current = await ring.sign(payload, purpose)
            expect(jwt.decode(current, { complete: true })).toMatchObject({ header: { kid: `${purpose}-local-v1` } })
            await expect(ring.verify(current, purpose, verification(purpose))).resolves.toMatchObject(payload)
        } finally { ring.close() }
    })

    it('rejects weak legacy HMAC without writing or silently resetting sessions', async () => {
        const jwt = config.get<Record<string, { expiresInMs: number; secret: string }>>('Jwt')!
        jwt.activationToken.secret = 'x'.repeat(48)
        await expect(migrateLocalJwtKeys(input())).rejects.toMatchObject({ code: 'INVALID_LEGACY_MATERIAL' })
        await expect(lstat(target)).rejects.toThrow()
    })

    it('binds migration approval to the imported bytes, not just public metadata', async () => {
        const preview = await migrateLocalJwtKeys(input())
        config.get<{ secret: string }>('Jwt.activationToken')!.secret = randomBytes(64).toString('base64')
        await expect(migrateLocalJwtKeys(input(), preview.digest)).rejects.toMatchObject({ code: 'CONFLICT' })
        await expect(lstat(target)).rejects.toThrow()
    })

    it('supports explicitly extended legacy windows and rejects accidental shortening', async () => {
        const legacyAcceptUntil = new Date(Date.parse(at) + 3600000).toISOString(), httpRefreshUntil = new Date(Date.parse(at) + 86400000).toISOString()
        const preview = await migrateLocalJwtKeys({ ...input(), legacyAcceptUntil, httpRefreshUntil })
        expect(preview.windows.every(domain => domain.acceptUntil === legacyAcceptUntil)).toBe(true)
        expect(preview.windows.find(domain => domain.purpose === TokenType.AccessToken)?.refreshUntil).toBe(httpRefreshUntil)
        await expect(migrateLocalJwtKeys({ ...input(), legacyAcceptUntil: at })).rejects.toThrow()
    })

    it.each([Environment.Staging, Environment.Production])('rejects local source and migration for %s before reading files', async environment => {
        await expect(createLocalJwtKeyRuntime('/not-read/settings.json', environment)).rejects.toMatchObject({ code: 'ENVIRONMENT_NOT_ALLOWED' })
        config.get<{ env: Environment }>('App')!.env = environment
        await expect(migrateLocalJwtKeys(input())).rejects.toMatchObject({ code: 'ENVIRONMENT_NOT_ALLOWED' })
        expect(() => validateEnvironment(buildTestEnvironment({ APP_ENV: environment, JWT_LOCAL_KEYS_CONFIG: 'unread-settings.json' }))).toThrow('only allowed')
    })

    it('rejects descriptor path escapes and inline material without leaking rejected values', async () => {
        const path = await initialize(), settings = JSON.parse(await readFile(path, 'utf8'))
        settings.bindings[0].privateKeyFile = '../../outside-private.pem'
        await writeFile(path, JSON.stringify(settings))
        await expect(createLocalJwtKeyRuntime(path, Environment.Test)).rejects.toThrow('INVALID_CONFIGURATION')
        settings.bindings[0].privateKeyFile = 'materials/key.pem'; settings.bindings[0].privateKey = 'confidential-input'
        await writeFile(path, JSON.stringify(settings))
        await expect(createLocalJwtKeyRuntime(path, Environment.Test)).rejects.not.toThrow('confidential-input')
    })

    it.each([TokenType.AccessToken, TokenType.ActivationToken])('adds, prepares and activates %s without restarting the existing source', async purpose => {
        const path = await initialize(), runtime = await createLocalJwtKeyRuntime(path, Environment.Test), jwt = new JwtService()
        const ring = new JwtKeyRing(runtime, Environment.Test, jwt)
        try {
            await ring.initialize()
            const original = await ring.sign(claims(purpose), purpose)
            const request = await generateLocalJwtKey(path, Environment.Test, purpose, 'generated-v2')
            const registry = new JwtKeyFileRegistry(runtime.localPaths, Environment.Test)
            const admin = new JwtKeyAdministration(registry, Environment.Test, runtime.materialSource)
            const preview = await admin.change(request)
            await admin.change(request, preview.digest)
            const activate = { timestamp: new Date().toISOString(), expectedRevision: 2, operator: 'test', reason: 'Test activation',
                command: { kind: 'activate' as const, purpose, kid: 'generated-v2', distributionConfirmed: true as const, verifyUntil: new Date(Date.now() + 86400000).toISOString() } }
            await admin.change(activate, (await admin.change(activate)).digest)
            const current = await ring.sign(claims(purpose), purpose)
            expect(jwt.decode(current, { complete: true })).toMatchObject({ header: { kid: 'generated-v2' } })
            await expect(ring.verify(original, purpose, verification(purpose))).resolves.toMatchObject({ typ: purpose })
            await expect(ring.verify(current, purpose, verification(purpose))).resolves.toMatchObject({ typ: purpose })
            await expect(generateLocalJwtKey(path, Environment.Test, purpose, 'generated-v2')).rejects.toThrow()
        } finally { ring.close() }
    })

    it('wires the local source through canonical configuration and Nest lifecycle, without legacy key fallback', async () => {
        const path = await initialize(), legacy = { getAccessKeyPair: jest.fn(() => { throw new Error('Unexpected legacy access') }), getWsKeyPair: jest.fn() }
        const missingLegacy = Object.fromEntries(legacyJwtSecretSources.map(source => [source, undefined]))
        const module = await Test.createTestingModule({ imports: [createTestConfigurationModule({ JWT_LOCAL_KEYS_CONFIG: path, ...missingLegacy }), JwtKeyRuntimeModule.registerLocal()],
            providers: [JwtToolsService, JwtService,
                { provide: IDENTITY_READ_PORT, useValue: { getUserScopesById: async () => [] } },
                { provide: SessionService, useValue: { registerIssuedToken: async () => undefined, isTokenRevoked: async () => false } },
                { provide: LoggerPort, useValue: { forContext: () => ({ warn() {} }) } },
                { provide: JwtKeysProvider, useValue: legacy },
                { provide: SecurityService, useValue: { encryptUserId: () => 'opaque-test-sub' } },
                { provide: RedisService, useValue: {} }] }).compile()
        try {
            await module.init()
            expect(module.get(ConfigService).get('Jwt.activationToken.secret')).toBeUndefined()
            const token = await module.get(JwtToolsService).generateToken('11111111-1111-4111-8111-111111111111', TokenType.AccessToken, '22222222-2222-4222-8222-222222222222')
            expect(module.get(JwtService).decode(token, { complete: true })).toMatchObject({ header: { kid: 'AccessToken-local-v1' } })
            expect(legacy.getAccessKeyPair).not.toHaveBeenCalled()
        } finally { await module.close() }
    })

    it('keeps the material dotenv out of process environment and denies purpose swaps', async () => {
        const path = await initialize(), runtime = await createLocalJwtKeyRuntime(path, Environment.Test)
        const variable = 'JWT_LOCAL_ACTIVATIONTOKEN_V1_B64', previous = process.env[variable]
        await runtime.materialSource.resolve({ environment: Environment.Test, purpose: TokenType.ActivationToken, kid: 'ActivationToken-local-v1',
            algorithm: 'HS512', material: { reference: 'ActivationToken-local-v1', version: 'v1' } })
        expect(process.env[variable]).toBe(previous)
        await expect(runtime.materialSource.resolve({ environment: Environment.Test, purpose: TokenType.ChangePasswordToken, kid: 'ActivationToken-local-v1',
            algorithm: 'HS512', material: { reference: 'ActivationToken-local-v1', version: 'v1' } })).rejects.toThrow()
    })

    it('requires legacy env secrets only while the local runtime is disabled', () => {
        const raw = buildTestEnvironment({ JWT_LOCAL_KEYS_CONFIG: '/synthetic/settings.json' })
        for (const name of legacyJwtSecretSources) delete raw[name]
        expect(validateEnvironment(raw).JWT_LOCAL_KEYS_CONFIG).toBe('/synthetic/settings.json')
        raw.JWT_LOCAL_KEYS_CONFIG = ''
        expect(() => validateEnvironment(raw)).toThrow('is required without the local key runtime')
    })

    it('keeps absent local configuration disabled through real Nest injection', async () => {
        const module = await Test.createTestingModule({ imports: [createTestConfigurationModule({ JWT_LOCAL_KEYS_CONFIG: '' }), JwtKeyRuntimeModule.registerLocal()],
            providers: [{ provide: 'capture', inject: [JWT_KEY_RUNTIME_OPTIONS], useFactory: (options: unknown) => ({ configured: options !== undefined }) }] }).compile()
        try { await module.init(); expect(module.get('capture')).toEqual({ configured: false }) } finally { await module.close() }
    })

    it('does not reassign an observed reference/version to another dotenv alias', async () => {
        const path = await initialize(), runtime = await createLocalJwtKeyRuntime(path, Environment.Test)
        const settings = JSON.parse(await readFile(path, 'utf8'))
        settings.bindings.find((binding: { purpose: TokenType }) => binding.purpose === TokenType.ActivationToken).secretEnvironmentVariable = 'JWT_LOCAL_REPLACED_B64'
        await writeFile(path, JSON.stringify(settings))
        await expect(runtime.materialSource.resolve({ environment: Environment.Test, purpose: TokenType.ActivationToken, kid: 'ActivationToken-local-v1',
            algorithm: 'HS512', material: { reference: 'ActivationToken-local-v1', version: 'v1' } })).rejects.toThrow()
    })

    it('retains warm material when a local file is missing, fails cold startup, and still revokes without that file', async () => {
        const path = await initialize(), runtime = await createLocalJwtKeyRuntime(path, Environment.Test), jwt = new JwtService()
        const warm = new JwtKeyRing(runtime, Environment.Test, jwt), cold = new JwtKeyRing(runtime, Environment.Test, jwt)
        try {
            await warm.initialize()
            await unlink(join(target, 'materials/AccessToken-local-v1.private.pem'))
            await expect(warm.sign(claims(TokenType.AccessToken), TokenType.AccessToken)).resolves.toEqual(expect.any(String))
            await expect(cold.initialize()).rejects.toMatchObject({ code: 'MATERIAL_UNAVAILABLE' })
            const admin = new JwtKeyAdministration(new JwtKeyFileRegistry(runtime.localPaths, Environment.Test), Environment.Test)
            const request = { timestamp: new Date().toISOString(), expectedRevision: 1, operator: 'test', reason: 'Test revocation',
                command: { kind: 'revoke' as const, purpose: TokenType.AccessToken, kid: 'AccessToken-local-v1', suspendIssuance: true as const } }
            await admin.change(request, (await admin.change(request)).digest)
            await expect(warm.sign(claims(TokenType.AccessToken), TokenType.AccessToken)).rejects.toThrow()
        } finally { warm.close(); cold.close() }
    })

    it('runs the migration CLI with synthetic config and connects the administrative CLI to the same local store', async () => {
        jest.spyOn(JwtKeysProvider.prototype, 'getAccessKeyPair').mockReturnValue(http)
        jest.spyOn(JwtKeysProvider.prototype, 'getWsKeyPair').mockReturnValue(ws)
        const out = jest.fn(), error = jest.fn(), argv = ['init', '--directory', target, '--at', at]
        expect(await runJwtLocalCli(argv, { out, error }, async () => config)).toBe(0)
        const preview = JSON.parse(out.mock.calls[0][0] as string)
        expect(await runJwtLocalCli([...argv, '--apply', preview.digest], { out, error }, async () => config)).toBe(0)
        const path = join(target, 'settings.json'), runtime = await createLocalJwtKeyRuntime(path, Environment.Test)
        const request = await generateLocalJwtKey(path, Environment.Test, TokenType.ActivationToken, 'cli-next')
        const requestFile = join(directory, 'request.json'); await writeFile(requestFile, JSON.stringify(request))
        const common = ['change', '--current', runtime.localPaths.currentDirectory, '--history', runtime.localPaths.historyDirectory,
            '--env', Environment.Test, '--local-config', path, '--request', requestFile]
        out.mockClear()
        expect(await runJwtKeysCli(common, { out, error })).toBe(0)
        expect(await runJwtKeysCli([...common, '--apply', JSON.parse(out.mock.calls[0][0] as string).digest], { out, error })).toBe(0)
        expect((await new JwtKeyFileRegistry(runtime.localPaths, Environment.Test).read()).revision).toBe(2)
    })

    it('rejects migration destinations inside tracked sibling workspaces before reading legacy keys', async () => {
        const readKeys = jest.spyOn(JwtKeysProvider.prototype, 'getAccessKeyPair')
        const out = jest.fn(), error = jest.fn()
        const sibling = resolve(process.cwd(), '../MercurionWebNg/untracked-secret-output')
        expect(await runJwtLocalCli(['init', '--directory', sibling], { out, error }, async () => config)).toBe(1)
        expect(readKeys).not.toHaveBeenCalled()
        expect(out).not.toHaveBeenCalled()
    })
})
