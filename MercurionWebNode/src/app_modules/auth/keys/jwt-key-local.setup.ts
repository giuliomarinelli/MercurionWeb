import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { createHash, generateKeyPairSync, randomBytes, randomUUID } from 'node:crypto'
import { lstat, mkdir, open, realpath, rename, rmdir, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { Environment } from 'src/config/config.schema'
import { utcNow } from 'src/utils/temporal/temporal'
import { TokenType } from '../models/enums/token-type.enum'
import type { JwtKeyPair } from '../providers/jwt-keys.provider'
import { jwtKeyAlgorithms } from './jwt-key-manifest'
import { parseJwtKeyManifest } from './jwt-key-manifest.parser'
import type { JwtKeyMaterial } from './jwt-key-material-source.port'
import { JwtKeyRing } from './jwt-key-ring'
import { JwtKeyFileRegistry } from './jwt-key-registry'
import { assertLocalKeyEnvironment, createLocalJwtKeyRuntime, JwtLocalKeyError, localKeyPath,
    readLocalKeyFile, readLocalKeySettings, type LocalKeyBinding, type LocalKeySettings } from './jwt-key-local.source'

const configurationName = (purpose: TokenType) => purpose === TokenType.ws_AccessToken ? 'ws_accessToken'
    : purpose === TokenType.SSO_PreAuthorizationToken ? 'sso_preAuthorizationToken' : purpose[0].toLowerCase() + purpose.slice(1)
export interface LocalKeyMigrationInput {
    readonly config: ConfigService
    readonly http: JwtKeyPair
    readonly ws: JwtKeyPair
    readonly directory: string
    readonly at: string
    readonly legacyAcceptUntil?: string
    readonly httpRefreshUntil?: string
}

/** Sensitive plan remains in memory. Only preview is safe to serialize. */
export async function migrateLocalJwtKeys(input: LocalKeyMigrationInput, approval?: string) {
    const environment = input.config.getOrThrow<Environment>('App.env')
    assertLocalKeyEnvironment(environment)
    const directory = resolve(input.directory), instant = Date.parse(input.at)
    if (!Number.isFinite(instant) || new Date(instant).toISOString() !== input.at || instant > Date.now()
        || Date.now() - instant > 300000) throw new JwtLocalKeyError('INVALID_CONFIGURATION')
    const materials = new Map<string, JwtKeyMaterial>()
    const files = new Map<string, string>(), bindings: LocalKeyBinding[] = [], lines: string[] = []
    const sessionMs = Math.max(input.config.getOrThrow<number>('Session.shortSessionLasting'),
        input.config.getOrThrow<number>('Session.persistentSessionLasting')) * 1000
    const domains = Object.values(TokenType).map(purpose => {
        const algorithm = jwtKeyAlgorithms[purpose], kid = `${purpose}-local-v1`, reference = kid, version = 'v1'
        const ttl = input.config.getOrThrow<{ expiresInMs: number; secret?: string }>(`Jwt.${configurationName(purpose)}`)
        if (!Number.isFinite(ttl.expiresInMs) || ttl.expiresInMs <= 0 || !Number.isFinite(sessionMs) || sessionMs <= 0) throw new JwtLocalKeyError('INVALID_CONFIGURATION')
        let publicKeyPem: string | undefined
        if (algorithm === 'RS256') {
            const pair = purpose === TokenType.AccessToken ? input.http : input.ws
            publicKeyPem = pair.publicKey
            const publicKeyFile = `materials/${kid}.public.pem`, privateKeyFile = `materials/${kid}.private.pem`
            files.set(publicKeyFile, pair.publicKey); files.set(privateKeyFile, pair.privateKey)
            bindings.push({ purpose, algorithm, reference, version, publicKeyFile, privateKeyFile })
            materials.set(reference, { algorithm, encoding: 'pem', ...pair })
        } else {
            // Preserve the exact bytes used by the old signer; never Base64-decode a legacy string.
            if (typeof ttl.secret !== 'string' || Buffer.byteLength(ttl.secret, 'utf8') < 64) throw new JwtLocalKeyError('INVALID_LEGACY_MATERIAL', purpose)
            const name = `JWT_LOCAL_${purpose.toUpperCase()}_V1_B64`, secret = Buffer.from(ttl.secret, 'utf8').toString('base64')
            lines.push(`${name}=${secret}`)
            bindings.push({ purpose, algorithm, reference, version, encoding: 'base64', secretEnvironmentVariable: name })
            materials.set(reference, { algorithm, encoding: 'base64', secret })
        }
        const minimumAccept = instant + ttl.expiresInMs + 60000
        const acceptUntil = input.legacyAcceptUntil ?? new Date(minimumAccept).toISOString()
        const acceptMs = Date.parse(acceptUntil)
        const minimumRefresh = Math.max(instant + Math.max(sessionMs, ttl.expiresInMs) + 60000, acceptMs)
        const refreshUntil = input.httpRefreshUntil ?? new Date(minimumRefresh).toISOString()
        if (!Number.isFinite(acceptMs) || acceptMs < minimumAccept
            || (purpose === TokenType.AccessToken && (!Number.isFinite(Date.parse(refreshUntil)) || Date.parse(refreshUntil) < minimumRefresh))) throw new JwtLocalKeyError('INVALID_CONFIGURATION')
        return { purpose, algorithm, issuance: 'enabled', activeKid: kid,
            keys: [{ kid, material: { reference, version }, state: 'active', createdAt: input.at, activatedAt: input.at,
                ...(publicKeyPem ? { publicKeyPem } : {}) }],
            legacy: { kid, acceptUntil, ...(purpose === TokenType.AccessToken
                ? { refreshUntil } : {}) } }
    })
    const manifest = parseJwtKeyManifest({ schemaVersion: 1, environment, revision: 1, previousRevision: null, updatedAt: input.at,
        lastOperation: { kind: 'initialize', operator: 'local-migration', reason: 'Import existing local signing material without changing its bytes' }, domains }, environment)
    const settings: LocalKeySettings = { schemaVersion: 1, environment, currentDirectory: 'current', historyDirectory: 'history',
        materialEnvironmentFile: 'material.env', bindings }
    const validation = new JwtKeyRing({ manifestSource: { read: async () => manifest }, materialSource: { resolve: async request => materials.get(request.material.reference)! } }, environment, new JwtService())
    try { await validation.initialize() } finally { validation.close() }
    // Bind approval to the actual imported bytes without publishing per-secret fingerprints or any material.
    const digest = createHash('sha256').update(JSON.stringify({ directory, manifest, settings, material: [...materials] })).digest('hex')
    const preview = { directory, config: join(directory, 'settings.json'), environment, at: input.at, digest,
        windows: manifest.domains.map(domain => ({ purpose: domain.purpose, ...domain.legacy })), applied: approval !== undefined }
    if (approval === undefined) return preview
    if (approval !== digest) throw new JwtLocalKeyError('CONFLICT')
    if (await exists(directory)) throw new JwtLocalKeyError('CONFLICT')
    await mkdir(dirname(directory), { mode: 0o700, recursive: true })
    if (await realpath(dirname(directory)) !== dirname(directory)) throw new JwtLocalKeyError('INVALID_CONFIGURATION')
    const staging = `${directory}.preparing-${randomUUID()}`
    await mkdir(staging, { mode: 0o700, recursive: true })
    // The staging directory intentionally remains private on failure; it is never admitted as the live registry.
    await mkdir(join(staging, 'materials'), { mode: 0o700 })
    for (const [file, contents] of files) await writeExclusive(join(staging, file), contents)
    await writeExclusive(join(staging, 'material.env'), lines.join('\n') + '\n')
    await writeExclusive(join(staging, 'settings.json'), JSON.stringify(settings, null, 2))
    await new JwtKeyFileRegistry({ currentDirectory: join(staging, 'current'), historyDirectory: join(staging, 'history') }, environment).initialize(manifest)
    const finalValidation = new JwtKeyRing(await createLocalJwtKeyRuntime(join(staging, 'settings.json'), environment), environment, new JwtService())
    try { await finalValidation.initialize() } finally { finalValidation.close() }
    if (await exists(directory)) throw new JwtLocalKeyError('CONFLICT')
    await rename(staging, directory)
    return preview
}

/** Generates files and a binding only; admission and activation still require the existing administrative preview/apply. */
export async function generateLocalJwtKey(configPath: string, environment: Environment, purpose: TokenType, kid: string) {
    assertLocalKeyEnvironment(environment)
    if (!Object.values(TokenType).includes(purpose) || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(kid)) throw new JwtLocalKeyError('INVALID_CONFIGURATION')
    const path = resolve(configPath), root = dirname(path), lock = join(root, '.material-writer-lock')
    try { await mkdir(lock) } catch { throw new JwtLocalKeyError('CONFLICT') }
    try {
        const settings = await readLocalKeySettings(path, environment)
        if (settings.bindings.some(binding => binding.reference === kid)) throw new JwtLocalKeyError('CONFLICT')
        const runtime = await createLocalJwtKeyRuntime(path, environment)
        const manifest = parseJwtKeyManifest(await runtime.manifestSource.read(), environment)
        if (manifest.domains.some(domain => domain.keys.some(key => key.kid === kid))) throw new JwtLocalKeyError('CONFLICT')
        const algorithm = jwtKeyAlgorithms[purpose], version = 'v1'
        const binding: LocalKeyBinding = algorithm === 'RS256'
            ? { purpose, algorithm, reference: kid, version, publicKeyFile: `materials/${kid}.public.pem`, privateKeyFile: `materials/${kid}.private.pem` }
            : { purpose, algorithm, reference: kid, version, encoding: 'base64',
                secretEnvironmentVariable: `JWT_LOCAL_${purpose.toUpperCase()}_${kid.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 64)}_${randomBytes(6).toString('hex').toUpperCase()}_B64` }
        let publicKeyPem: string | undefined
        if (algorithm === 'RS256') {
            const pair = generateKeyPairSync('rsa', { modulusLength: 2048, publicKeyEncoding: { type: 'spki', format: 'pem' }, privateKeyEncoding: { type: 'pkcs8', format: 'pem' } })
            publicKeyPem = pair.publicKey
            await writeExclusive(localKeyPath(root, binding.privateKeyFile), pair.privateKey)
            await writeExclusive(localKeyPath(root, binding.publicKeyFile), pair.publicKey)
        } else {
            const envPath = localKeyPath(root, settings.materialEnvironmentFile)
            const previous = await readLocalKeyFile(envPath)
            await replacePrivate(envPath, previous.trimEnd() + `\n${binding.secretEnvironmentVariable}=${randomBytes(64).toString('base64')}\n`)
        }
        await replacePrivate(path, JSON.stringify({ ...settings, bindings: [...settings.bindings, binding] }, null, 2))
        const timestamp = utcNow()
        return { timestamp, expectedRevision: manifest.revision, operator: 'local-operator', reason: 'Prepare generated local key',
            command: { kind: 'prepare' as const, purpose, key: { kid, material: { reference: kid, version }, state: 'prepared' as const,
                createdAt: timestamp, ...(publicKeyPem ? { publicKeyPem } : {}) } } }
    } finally { await rmdir(lock) }
}
async function exists(path: string): Promise<boolean> {
    try { await lstat(path); return true } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error }
}
async function writeExclusive(path: string, contents: string): Promise<void> {
    const file = await open(path, 'wx', 0o600)
    try { await file.writeFile(contents, 'utf8'); await file.sync() } finally { await file.close() }
}
async function replacePrivate(path: string, contents: string): Promise<void> {
    const temporary = `${path}.tmp-${randomUUID()}`
    try { await writeExclusive(temporary, contents); await rename(temporary, path) }
    finally { await unlink(temporary).catch(() => undefined) }
}
