import { mkdtemp, readFile, readdir, rm, writeFile, mkdir, unlink } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { generateKeyPairSync, randomBytes } from 'node:crypto'
import { Environment } from 'src/config/config.schema'
import { TokenType } from '../models/enums/token-type.enum'
import { jwtKeyAlgorithms, type JwtKeyEntry } from './jwt-key-manifest'
import { JwtKeyFileRegistry } from './jwt-key-registry'
import { JwtKeyAdministration, type JwtKeyAdministrationRequest, type JwtKeyAdministrationCommand } from './jwt-key-administration'
import { runJwtKeysCli } from 'src/jwt-keys.cli'
import * as fs from 'node:fs/promises'
import { JwtService } from '@nestjs/jwt'
import { JwtKeyRing } from './jwt-key-ring'
import { JwtKeyRuntimeModule } from './jwt-key-runtime.module'

describe('Durable JWT registry and operational CLI', () => {
    let directory: string
    let paths: { currentDirectory: string; historyDirectory: string }
    let registry: JwtKeyFileRegistry
    let admin: JwtKeyAdministration
    const material = { algorithm: 'HS512' as const, encoding: 'base64' as const, secret: randomBytes(64).toString('base64') }
    const source = { resolve: jest.fn().mockResolvedValue(material) }
    const purpose = TokenType.ActivationToken
    let createdAt: string
    const newKey = (kid = 'activation-v1'): JwtKeyEntry => ({ kid, material: { reference: kid, version: 'v1' }, state: 'prepared', createdAt: createdAt as never })

    beforeEach(async () => {
        directory = await mkdtemp(join(tmpdir(), 'mercurion-jwt-b2-'))
        paths = { currentDirectory: join(directory, 'current'), historyDirectory: join(directory, 'audit') }
        registry = new JwtKeyFileRegistry(paths, Environment.Test)
        source.resolve.mockReset().mockResolvedValue(material)
        admin = new JwtKeyAdministration(registry, Environment.Test, source)
        createdAt = new Date(Date.now() - 1000).toISOString()
        await registry.initialize({ schemaVersion: 1, environment: Environment.Test, revision: 1, previousRevision: null,
            updatedAt: createdAt, lastOperation: { kind: 'initialize', operator: 'test-operator', reason: 'Synthetic fixture' },
            domains: Object.values(TokenType).map(purpose => ({ purpose, algorithm: jwtKeyAlgorithms[purpose], issuance: 'suspended', activeKid: null, keys: [] })) })
    })
    afterEach(async () => {
        jest.restoreAllMocks()
        // Delete only this test's absolute mkdtemp child, never a computed repository path.
        const target = resolve(directory)
        if (dirname(target) !== resolve(tmpdir()) || !target.includes('mercurion-jwt-b2-')) throw new Error('Unsafe test cleanup')
        await rm(target, { recursive: true, force: true })
    })

    async function request(command: JwtKeyAdministrationCommand): Promise<JwtKeyAdministrationRequest> {
        return { timestamp: new Date().toISOString(), expectedRevision: (await registry.read()).revision,
            operator: 'test-operator', reason: 'Synthetic operation', command }
    }
    async function apply(command: JwtKeyAdministrationCommand) {
        const value = await request(command)
        const preview = await admin.change(value)
        await admin.change(value, preview.digest)
        return preview
    }
    async function active() {
        await apply({ kind: 'prepare', purpose, key: newKey() })
        await apply({ kind: 'activate', purpose, kid: 'activation-v1', distributionConfirmed: true, verifyUntil: new Date(Date.now() + 3600000).toISOString() })
    }

    it('previews without writing or fetching material, then applies exactly the approved revision', async () => {
        const value = await request({ kind: 'prepare', purpose, key: newKey() })
        const preview = await admin.change(value)
        expect((await registry.read()).revision).toBe(1)
        expect(source.resolve).not.toHaveBeenCalled()
        await expect(admin.change(value, 'wrong-digest')).rejects.toMatchObject({ code: 'CONFLICT' })
        await admin.change(value, preview.digest)
        expect((await registry.read()).revision).toBe(2)
        await expect(admin.change(value, preview.digest)).rejects.toMatchObject({ code: 'CONFLICT' })
    })

    it('requires working material preflight to prepare and activate, but revokes during manager outage', async () => {
        source.resolve.mockRejectedValueOnce(new Error('confidential provider response'))
        const value = await request({ kind: 'prepare', purpose, key: newKey() })
        const preview = await admin.change(value)
        await expect(admin.change(value, preview.digest)).rejects.toThrow()
        expect((await registry.read()).revision).toBe(1)
        await active()
        source.resolve.mockRejectedValue(new Error('Provider offline'))
        await apply({ kind: 'revoke', purpose, kid: 'activation-v1', suspendIssuance: true })
        expect((await registry.read()).domains.find(domain => domain.purpose === purpose)).toMatchObject({ issuance: 'suspended', activeKid: null,
            keys: [{ kid: 'activation-v1', state: 'revoked' }] })
    })

    it('requires explicit suspension before revoking an active key', async () => {
        await active()
        await expect(admin.change(await request({ kind: 'revoke', purpose, kid: 'activation-v1' }))).rejects.toThrow()
        expect((await registry.read()).revision).toBe(3)
    })

    it('preserves retired tombstones and prevents resurrection after restarting the reader', async () => {
        await active()
        await apply({ kind: 'revoke', purpose, kid: 'activation-v1', suspendIssuance: true })
        await apply({ kind: 'retire', purpose, kid: 'activation-v1' })
        registry = new JwtKeyFileRegistry(paths, Environment.Test)
        const previous = await registry.read()
        const next = JSON.parse(JSON.stringify(previous))
        next.previousRevision = next.revision++; next.lastOperation.kind = 'activate'; next.updatedAt = new Date().toISOString()
        const domain = next.domains.find((entry: { purpose: TokenType }) => entry.purpose === purpose)
        domain.keys[0].state = 'active'; delete domain.keys[0].revokedAt; domain.activeKid = 'activation-v1'; domain.issuance = 'enabled'
        await expect(registry.commit(previous.revision, next)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' })
    })

    it('rejects a rollback of current and repairs forward only against retained audit', async () => {
        const old = await readFile(join(paths.currentDirectory, 'manifest.json'))
        await active()
        await writeFile(join(paths.currentDirectory, 'manifest.json'), old)
        const restarted = new JwtKeyFileRegistry(paths, Environment.Test)
        await expect(restarted.read()).rejects.toMatchObject({ code: 'UNAVAILABLE' })
        await expect(restarted.recoverLatest(1)).rejects.toMatchObject({ code: 'CONFLICT' })
        await restarted.recoverLatest(3)
        expect((await restarted.read()).revision).toBe(3)
    })

    it('fails closed on missing/tampered audit and never bootstraps from current alone', async () => {
        await active()
        await unlink(join(paths.historyDirectory, '2.json'))
        await expect(new JwtKeyFileRegistry(paths, Environment.Test).read()).rejects.toThrow()
        await expect(registry.recoverLatest(3)).rejects.toThrow()
    })

    it('rejects altered revision content and oversized current files', async () => {
        const path = join(paths.historyDirectory, '1.json')
        const revision = JSON.parse(await readFile(path, 'utf8'))
        revision.manifest.lastOperation.reason = 'Altered audit'
        await writeFile(path, JSON.stringify(revision))
        await expect(registry.read()).rejects.toThrow()
        await expect(registry.recoverLatest(1)).rejects.toThrow()
        await writeFile(join(paths.currentDirectory, 'manifest.json'), 'x'.repeat(256 * 1024 + 1))
        await expect(registry.read()).rejects.toThrow()
    })

    it('allows only one of two concurrent writers with the same expected revision', async () => {
        const value = await request({ kind: 'prepare', purpose, key: newKey() })
        const preview = await admin.change(value)
        const results = await Promise.allSettled([admin.change(value, preview.digest), admin.change(value, preview.digest)])
        expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
        expect((await registry.read()).revision).toBe(2)
    })

    it('rejects HMAC reuse across purposes during material preflight', async () => {
        await active()
        const value = await request({ kind: 'prepare', purpose: TokenType.ChangePasswordToken, key: newKey('different-purpose') })
        const preview = await admin.change(value)
        await expect(admin.change(value, preview.digest)).rejects.toMatchObject({ code: 'INVALID_MATERIAL' })
        expect((await registry.read()).revision).toBe(3)
    })

    it('rejects relative or overlapping restore directories', () => {
        expect(() => new JwtKeyFileRegistry({ ...paths, currentDirectory: './relative' }, Environment.Test)).toThrow()
        expect(() => new JwtKeyFileRegistry({ ...paths, historyDirectory: join(paths.currentDirectory, 'audit') }, Environment.Test)).toThrow()
    })

    it('refuses competing writer locks and stale revisions', async () => {
        await mkdir(join(paths.historyDirectory, '.writer-lock'))
        const value = await request({ kind: 'prepare', purpose, key: newKey() })
        const preview = await admin.change(value)
        await expect(admin.change(value, preview.digest)).rejects.toMatchObject({ code: 'CONFLICT' })
        expect((await registry.read()).revision).toBe(1)
    })

    it('never serializes private/HMAC material or raw provider failures to history or CLI output', async () => {
        await active()
        const files = await readdir(paths.historyDirectory)
        for (const name of files) {
            const contents = await readFile(join(paths.historyDirectory, name), 'utf8')
            expect(contents).not.toContain(material.secret)
            expect(contents).not.toContain('PRIVATE KEY')
        }
        const out = jest.fn(); const error = jest.fn()
        const bad = await request({ kind: 'prepare', purpose, key: { ...newKey('another'), privateKey: 'confidential-value' } as never })
        await writeFile(join(directory, 'request.json'), JSON.stringify(bad))
        const code = await runJwtKeysCli(['change', '--current', paths.currentDirectory, '--history', paths.historyDirectory,
            '--env', 'test', '--request', join(directory, 'request.json')], { out, error })
        expect(code).toBe(1); expect(out).not.toHaveBeenCalled()
        expect(error.mock.calls.flat().join('')).not.toContain('confidential-value')
    })

    it('CLI preview/apply revokes with no Secret Manager bootstrap and enforces environment/arguments', async () => {
        await active()
        const value = await request({ kind: 'revoke', purpose, kid: 'activation-v1', suspendIssuance: true })
        const path = join(directory, 'request.json'); await writeFile(path, JSON.stringify(value))
        const argv = ['change', '--current', paths.currentDirectory, '--history', paths.historyDirectory, '--env', 'test', '--request', path]
        const out = jest.fn(); const error = jest.fn()
        expect(await runJwtKeysCli(argv, { out, error })).toBe(0)
        const preview = JSON.parse(out.mock.calls[0][0] as string)
        expect(await runJwtKeysCli([...argv, '--apply', preview.digest], { out, error })).toBe(0)
        expect((await registry.read()).revision).toBe(4)
        expect(await runJwtKeysCli([...argv, '--env', 'production'], { out, error })).toBe(1)
        expect(await runJwtKeysCli(['inspect', '--current', paths.currentDirectory, '--history', paths.historyDirectory, '--env', 'production'], { out, error })).toBe(1)
    })

    it('refuses prepare/activate application when no real material source is supplied', async () => {
        const value = await request({ kind: 'prepare', purpose, key: newKey() })
        const unavailable = new JwtKeyAdministration(registry, Environment.Test)
        const preview = await unavailable.change(value)
        await expect(unavailable.change(value, preview.digest)).rejects.toMatchObject({ code: 'UNAVAILABLE' })
        expect((await registry.read()).revision).toBe(1)
    })

    it('validates RSA material before prepare and keeps separate HTTP/WS identities', async () => {
        const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048,
            publicKeyEncoding: { format: 'pem', type: 'spki' }, privateKeyEncoding: { format: 'pem', type: 'pkcs8' } })
        source.resolve.mockResolvedValue({ algorithm: 'RS256', encoding: 'pem', publicKey, privateKey } as never)
        await apply({ kind: 'prepare', purpose: TokenType.AccessToken, key: { ...newKey('http-v1'), publicKeyPem: publicKey } })
        await expect(admin.change(await request({ kind: 'prepare', purpose: TokenType.ws_AccessToken,
            key: { ...newKey('ws-v1'), publicKeyPem: publicKey } }))).rejects.toThrow()
    })

    it('recovers forward after interruption between durable history and current replacement', async () => {
        const value = await request({ kind: 'prepare', purpose, key: newKey() })
        const preview = await admin.change(value)
        jest.spyOn(fs, 'rename').mockRejectedValueOnce(new Error('Synthetic interrupted replacement'))
        await expect(admin.change(value, preview.digest)).rejects.toMatchObject({ code: 'WRITE_FAILED' })
        expect(await readdir(paths.historyDirectory)).toContain('2.json')
        await expect(new JwtKeyFileRegistry(paths, Environment.Test).read()).rejects.toThrow()
        await registry.recoverLatest(2)
        expect((await registry.read()).revision).toBe(2)
    })

    it('denies relabelling a public key even after its public tombstone was retired', async () => {
        const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048,
            publicKeyEncoding: { format: 'pem', type: 'spki' }, privateKeyEncoding: { format: 'pem', type: 'pkcs8' } })
        source.resolve.mockResolvedValue({ algorithm: 'RS256', encoding: 'pem', publicKey, privateKey } as never)
        await apply({ kind: 'prepare', purpose: TokenType.AccessToken, key: { ...newKey('http-v1'), publicKeyPem: publicKey } })
        await apply({ kind: 'revoke', purpose: TokenType.AccessToken, kid: 'http-v1' })
        await apply({ kind: 'retire', purpose: TokenType.AccessToken, kid: 'http-v1' })
        const value = await request({ kind: 'prepare', purpose: TokenType.ws_AccessToken, key: { ...newKey('ws-new'), publicKeyPem: publicKey.replace(/\n/g, '\r\n') } })
        const preview = await admin.change(value)
        await expect(admin.change(value, preview.digest)).rejects.toMatchObject({ code: 'INVALID_TRANSITION' })
        expect((await registry.read()).revision).toBe(4)
    })

    it('integrates real file replacement and real-time idle WS eviction in under five seconds during manager outage', async () => {
        const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048,
            publicKeyEncoding: { format: 'pem', type: 'spki' }, privateKeyEncoding: { format: 'pem', type: 'pkcs8' } })
        source.resolve.mockResolvedValue({ algorithm: 'RS256', encoding: 'pem', publicKey, privateKey } as never)
        await apply({ kind: 'prepare', purpose: TokenType.ws_AccessToken, key: { ...newKey('ws-v1'), publicKeyPem: publicKey } })
        await apply({ kind: 'activate', purpose: TokenType.ws_AccessToken, kid: 'ws-v1', distributionConfirmed: true, verifyUntil: new Date(Date.now() + 60000).toISOString() })
        const ring = new JwtKeyRing(JwtKeyRuntimeModule.fromFiles(paths, Environment.Test, source), Environment.Test, new JwtService())
        let timeout: ReturnType<typeof setTimeout> | undefined
        try {
            await ring.initialize()
            const token = await ring.sign({ typ: TokenType.ws_AccessToken, iss: 'issuer', aud: 'ws', sub: 'opaque',
                jti: '11111111-1111-4111-8111-111111111111', sid: '22222222-2222-4222-8222-222222222222', scp: '',
                iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 }, TokenType.ws_AccessToken)
            await ring.verify(token, TokenType.ws_AccessToken, { issuer: 'issuer', audience: 'ws' })
            let evict!: () => void
            const eviction = new Promise<void>(resolve => { evict = resolve })
            await ring.watchVerifiedConnection('idle-socket', token, evict)
            source.resolve.mockClear().mockRejectedValue(new Error('Manager offline'))
            const started = Date.now()
            await apply({ kind: 'revoke', purpose: TokenType.ws_AccessToken, kid: 'ws-v1', suspendIssuance: true })
            await Promise.race([eviction, new Promise<never>((_resolve, reject) => { timeout = setTimeout(() => reject(new Error('WS deadline exceeded')), 4500) })])
            const elapsed = Date.now() - started
            expect(elapsed).toBeLessThan(5000)
            expect(source.resolve).not.toHaveBeenCalled()
            console.info(`Synthetic registry/idle WS eviction: ${elapsed} ms`)
        } finally { clearTimeout(timeout); ring.close() }
    }, 10000)

    it('measures a complete read of twenty audit revisions across all fifteen domains', async () => {
        const publicKey = () => generateKeyPairSync('rsa', { modulusLength: 2048 }).publicKey.export({ type: 'spki', format: 'pem' }).toString()
        const httpPublic = publicKey(); const wsPublic = publicKey()
        const measured = new JwtKeyFileRegistry({ currentDirectory: join(directory, 'measured-current'), historyDirectory: join(directory, 'measured-audit') }, Environment.Test)
        let manifest = await measured.initialize({ schemaVersion: 1, environment: Environment.Test, revision: 1, previousRevision: null,
            updatedAt: createdAt, lastOperation: { kind: 'initialize', operator: 'benchmark', reason: 'Synthetic read workload' },
            domains: Object.values(TokenType).map(purpose => ({ purpose, algorithm: jwtKeyAlgorithms[purpose], issuance: 'enabled', activeKid: `${purpose}-v1`,
                keys: [{ kid: `${purpose}-v1`, material: { reference: purpose, version: 'v1' }, state: 'active', createdAt, activatedAt: createdAt,
                    ...(jwtKeyAlgorithms[purpose] === 'RS256' ? { publicKeyPem: purpose === TokenType.AccessToken ? httpPublic : wsPublic } : {}) }] })) })
        for (let index = 2; index <= 20; index++) {
            const next = JSON.parse(JSON.stringify(manifest))
            next.previousRevision = manifest.revision; next.revision = index; next.updatedAt = new Date().toISOString(); next.lastOperation.kind = 'prepare'
            next.domains.find((domain: { purpose: TokenType }) => domain.purpose === purpose).keys.push(newKey(`benchmark-${index}`))
            manifest = await measured.commit(manifest.revision, next)
        }
        const start = Date.now()
        expect((await measured.read()).revision).toBe(20)
        const elapsed = Date.now() - start
        expect(elapsed).toBeLessThan(1000)
        console.info(`Synthetic registry read: 20 revisions / 15 domains / 34 keys: ${elapsed} ms`)
    }, 15000)
})
