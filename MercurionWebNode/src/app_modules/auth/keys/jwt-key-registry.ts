import { constants } from 'node:fs'
import { link, lstat, mkdir, open, readdir, realpath, rename, rmdir, unlink } from 'node:fs/promises'
import { createHash, createPublicKey, randomUUID } from 'node:crypto'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import type { Environment } from 'src/config/config.schema'
import type { JwtKeyManifest, JwtKeyEntry } from './jwt-key-manifest'
import { parseJwtKeyManifest } from './jwt-key-manifest.parser'
import type { JwtKeyManifestSource } from './jwt-key-runtime.module'

export class JwtKeyRegistryError extends Error {
    constructor(readonly code: 'UNAVAILABLE' | 'CONFLICT' | 'INVALID_TRANSITION' | 'WRITE_FAILED') {
        super(`JWT key registry operation failed: ${code}`)
        this.name = 'JwtKeyRegistryError'
    }
}

export interface JwtKeyRegistryPaths {
    readonly currentDirectory: string
    readonly historyDirectory: string
}

type Revision = { manifest: JwtKeyManifest; previousDigest: string | null; digest: string }
type HistoryHead = Revision & { publicOwners: ReadonlyMap<string, string> }
const maximumBytes = 256 * 1024
const maximumRevisions = 512
const canonical = (value: unknown) => JSON.stringify(value)
const digest = (manifest: JwtKeyManifest, previousDigest: string | null) => createHash('sha256')
    .update(canonical({ manifest, previousDigest })).digest('hex')

/** Append-only identity and state rules are checked on restart as well as during writes. */
export function validateJwtKeyTransition(previous: JwtKeyManifest, next: JwtKeyManifest): void {
    const invalid = () => { throw new JwtKeyRegistryError('INVALID_TRANSITION') }
    if (next.environment !== previous.environment || next.revision !== previous.revision + 1
        || next.previousRevision !== previous.revision || next.updatedAt < previous.updatedAt) invalid()
    for (const domain of previous.domains) {
        const current = next.domains.find(entry => entry.purpose === domain.purpose)!
        for (const old of domain.keys) {
            const key = current.keys.find(entry => entry.kid === old.kid)
            if (!key || canonical(key.material) !== canonical(old.material) || key.createdAt !== old.createdAt) invalid()
            if (key!.publicKeyPem !== old.publicKeyPem
                && !(key!.state === 'revoked' && key!.publicKeyPem === undefined)) invalid()
            const transitions: Record<JwtKeyEntry['state'], readonly JwtKeyEntry['state'][]> = {
                prepared: ['prepared', 'active', 'revoked'], active: ['active', 'verify-only', 'revoked'],
                'verify-only': ['verify-only', 'revoked'], revoked: ['revoked']
            }
            if (!transitions[old.state].includes(key!.state)) invalid()
            for (const field of ['activatedAt', 'signingStoppedAt', 'verifyUntil', 'revokedAt'] as const) {
                if (field in old && (!(field in key!) || (old as unknown as Record<string, unknown>)[field]
                    !== (key as unknown as Record<string, unknown>)[field])) invalid()
            }
        }
    }
    const oldKids = new Set(previous.domains.flatMap(domain => domain.keys.map(key => key.kid)))
    for (const domain of next.domains) for (const key of domain.keys) {
        if (!oldKids.has(key.kid) && (key.state !== 'prepared' || next.lastOperation.kind !== 'prepare')) invalid()
    }
}

/** Explicit trusted directories, mounted read-only into application containers. No secret I/O. */
export class JwtKeyFileRegistry implements JwtKeyManifestSource {
    private readonly current: string
    private readonly history: string

    constructor(paths: JwtKeyRegistryPaths, private readonly environment: Environment) {
        if (!paths || !isAbsolute(paths.currentDirectory) || !isAbsolute(paths.historyDirectory)) throw new JwtKeyRegistryError('UNAVAILABLE')
        this.current = resolve(paths.currentDirectory)
        this.history = resolve(paths.historyDirectory)
        // Separate restore domains: replacing the current directory must not roll back the audit directory too.
        const contains = (parent: string, child: string) => { const path = relative(parent, child); return path === '' || (!path.startsWith(`..${sep}`) && path !== '..' && !isAbsolute(path)) }
        if (contains(this.current, this.history) || contains(this.history, this.current)) throw new JwtKeyRegistryError('UNAVAILABLE')
    }

    async read(): Promise<JwtKeyManifest> {
        // A writer publishes history before current. Retry this short, fail-closed replacement window.
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                await this.checkDirectories()
                const latest = await this.latest()
                const current = parseJwtKeyManifest(await this.json(join(this.current, 'manifest.json')), this.environment)
                if (canonical(current) !== canonical(latest.manifest)) throw new JwtKeyRegistryError('UNAVAILABLE')
                return current
            } catch {
                if (attempt === 2) throw new JwtKeyRegistryError('UNAVAILABLE')
                await new Promise(resolve => setTimeout(resolve, 10))
            }
        }
        throw new JwtKeyRegistryError('UNAVAILABLE')
    }

    async initialize(value: unknown): Promise<JwtKeyManifest> {
        const manifest = parseJwtKeyManifest(value, this.environment)
        if (manifest.revision !== 1) throw new JwtKeyRegistryError('INVALID_TRANSITION')
        await mkdir(this.current, { recursive: true, mode: 0o750 })
        await mkdir(this.history, { recursive: true, mode: 0o750 })
        return this.lock(async () => {
            const names = (await readdir(this.history)).filter(name => name !== '.writer-lock')
            if (names.length !== 0 || await this.exists(join(this.current, 'manifest.json'))) throw new JwtKeyRegistryError('CONFLICT')
            await this.publish(manifest, null)
            return manifest
        })
    }

    async commit(expectedRevision: number, value: unknown): Promise<JwtKeyManifest> {
        const next = parseJwtKeyManifest(value, this.environment)
        return this.lock(async () => {
            const previous = await this.read()
            if (previous.revision !== expectedRevision) throw new JwtKeyRegistryError('CONFLICT')
            validateJwtKeyTransition(previous, next)
            const history = await this.latest()
            for (const domain of next.domains) for (const key of domain.keys) if (key.publicKeyPem) {
                const publicIdentity = createPublicKey(key.publicKeyPem).export({ format: 'der', type: 'spki' }).toString('base64')
                const owner = history.publicOwners.get(publicIdentity)
                if (owner !== undefined && owner !== key.kid) throw new JwtKeyRegistryError('INVALID_TRANSITION')
            }
            await this.publish(next, history.digest)
            return next
        })
    }

    /** Explicit forward repair after interruption between journal publication and current replacement. Never restores an older revision. */
    async recoverLatest(expectedRevision: number): Promise<JwtKeyManifest> {
        return this.lock(async () => {
            const latest = await this.latest()
            if (latest.manifest.revision !== expectedRevision) throw new JwtKeyRegistryError('CONFLICT')
            await this.replaceCurrent(latest.manifest)
            return latest.manifest
        })
    }

    private async latest(): Promise<HistoryHead> {
        const files = (await readdir(this.history)).filter(name => name !== '.writer-lock' && !/^\.tmp-[a-f0-9-]+$/.test(name))
        if (files.length < 1 || files.length > maximumRevisions || files.some(name => !/^[1-9][0-9]*\.json$/.test(name))) throw new JwtKeyRegistryError('UNAVAILABLE')
        files.sort((a, b) => Number(a.slice(0, -5)) - Number(b.slice(0, -5)))
        let previous: Revision | undefined
        const publicOwners = new Map<string, string>()
        const referenceOwners = new Map<string, string>()
        for (const [index, file] of files.entries()) {
            if (file !== `${index + 1}.json`) throw new JwtKeyRegistryError('UNAVAILABLE')
            const value = await this.json(join(this.history, file)) as Record<string, unknown>
            if (!value || typeof value !== 'object' || Object.keys(value).sort().join(',') !== 'digest,manifest,previousDigest') throw new JwtKeyRegistryError('UNAVAILABLE')
            const manifest = parseJwtKeyManifest(value.manifest, this.environment)
            const previousDigest = previous?.digest ?? null
            if (manifest.revision !== index + 1 || value.previousDigest !== previousDigest || value.digest !== digest(manifest, previousDigest)) throw new JwtKeyRegistryError('UNAVAILABLE')
            if (previous) validateJwtKeyTransition(previous.manifest, manifest)
            for (const domain of manifest.domains) for (const key of domain.keys) {
                const publicIdentity = key.publicKeyPem ? createPublicKey(key.publicKeyPem).export({ format: 'der', type: 'spki' }).toString('base64') : undefined
                for (const [owners, identity] of [[referenceOwners, canonical(key.material)], [publicOwners, publicIdentity]] as const) {
                    if (!identity) continue
                    const owner = owners.get(identity)
                    if (owner !== undefined && owner !== key.kid) throw new JwtKeyRegistryError('INVALID_TRANSITION')
                    owners.set(identity, key.kid)
                }
            }
            previous = { manifest, previousDigest, digest: value.digest as string }
        }
        return { ...previous!, publicOwners }
    }

    private async publish(manifest: JwtKeyManifest, previousDigest: string | null): Promise<void> {
        if (manifest.revision > maximumRevisions) throw new JwtKeyRegistryError('WRITE_FAILED')
        const record: Revision = { manifest, previousDigest, digest: digest(manifest, previousDigest) }
        const temporary = join(this.history, `.tmp-${randomUUID()}`)
        try {
            await this.write(temporary, record)
            // Hard-link publication is atomic and cannot replace an existing immutable revision.
            await link(temporary, join(this.history, `${manifest.revision}.json`))
            await this.flushDirectory(this.history)
            await this.replaceCurrent(manifest)
        } catch { throw new JwtKeyRegistryError('WRITE_FAILED') }
        finally { await unlink(temporary).catch(() => undefined) }
    }

    private async replaceCurrent(manifest: JwtKeyManifest): Promise<void> {
        const temporary = join(this.current, `.tmp-${randomUUID()}`)
        try {
            await this.write(temporary, manifest)
            await rename(temporary, join(this.current, 'manifest.json'))
            await this.flushDirectory(this.current)
        } finally { await unlink(temporary).catch(() => undefined) }
    }

    private async write(path: string, value: unknown): Promise<void> {
        const contents = canonical(value)
        if (Buffer.byteLength(contents) > maximumBytes) throw new JwtKeyRegistryError('WRITE_FAILED')
        const file = await open(path, 'wx', 0o640)
        try { await file.writeFile(contents, 'utf8'); await file.sync() } finally { await file.close() }
    }

    private async json(path: string): Promise<unknown> {
        if (!(await lstat(path)).isFile()) throw new JwtKeyRegistryError('UNAVAILABLE')
        const file = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0))
        try {
            const info = await file.stat()
            if (!info.isFile() || info.size > maximumBytes) throw new JwtKeyRegistryError('UNAVAILABLE')
            const bytes = await file.readFile()
            if (bytes.length > maximumBytes) throw new JwtKeyRegistryError('UNAVAILABLE')
            return JSON.parse(bytes.toString('utf8'))
        } finally { await file.close() }
    }

    private async lock<T>(operation: () => Promise<T>): Promise<T> {
        await this.checkDirectories()
        const lock = join(this.history, '.writer-lock')
        try { await mkdir(lock) } catch { throw new JwtKeyRegistryError('CONFLICT') }
        try { return await operation() } finally { await rmdir(lock) }
    }

    private async checkDirectories(): Promise<void> {
        for (const path of [this.current, this.history]) if (!(await lstat(path)).isDirectory()
            || await realpath(path) !== path) throw new JwtKeyRegistryError('UNAVAILABLE')
    }

    private async exists(path: string): Promise<boolean> {
        try { await lstat(path); return true } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false
            throw error
        }
    }

    private async flushDirectory(path: string): Promise<void> {
        // Windows does not expose POSIX directory fsync; Linux/Compose is the deployment durability gate.
        if (process.platform === 'win32') return
        const directory = await open(path, 'r')
        try { await directory.sync() } finally { await directory.close() }
    }
}
