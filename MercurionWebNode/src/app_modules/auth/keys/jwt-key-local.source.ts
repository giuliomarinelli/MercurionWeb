import { lstat, open, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { parseEnv } from 'node:util'
import { Environment } from 'src/config/config.schema'
import { TokenType } from '../models/enums/token-type.enum'
import { jwtKeyAlgorithms } from './jwt-key-manifest'
import { JwtKeyFileRegistry, type JwtKeyRegistryPaths } from './jwt-key-registry'
import type { JwtKeyMaterial, JwtKeyMaterialRequest, JwtKeyMaterialSource } from './jwt-key-material-source.port'
import { JwtKeyMaterialSourceError } from './jwt-key-material-source.port'
import type { JwtKeyRuntimeOptions } from './jwt-key-runtime.module'

export class JwtLocalKeyError extends Error {
    constructor(readonly code: 'INVALID_CONFIGURATION' | 'ENVIRONMENT_NOT_ALLOWED' | 'CONFLICT' | 'INVALID_LEGACY_MATERIAL', readonly purpose?: TokenType) {
        super(`Local JWT key operation failed: ${code}${purpose ? ` for ${purpose}` : ''}`)
        this.name = 'JwtLocalKeyError'
    }
}
export interface LocalKeyBinding {
    readonly purpose: TokenType
    readonly algorithm: 'RS256' | 'HS512'
    readonly reference: string
    readonly version: string
    readonly publicKeyFile?: string
    readonly privateKeyFile?: string
    readonly secretEnvironmentVariable?: string
    readonly encoding?: 'base64' | 'utf8'
}
export interface LocalKeySettings {
    readonly schemaVersion: 1
    readonly environment: Environment
    readonly currentDirectory: string
    readonly historyDirectory: string
    readonly materialEnvironmentFile: string
    readonly bindings: readonly LocalKeyBinding[]
}
const alias = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/
const invalid = (): never => { throw new JwtLocalKeyError('INVALID_CONFIGURATION') }
export function assertLocalKeyEnvironment(environment: Environment): void {
    if (environment !== Environment.Development && environment !== Environment.Test) throw new JwtLocalKeyError('ENVIRONMENT_NOT_ALLOWED')
}
export async function readLocalKeyFile(path: string, maximumBytes = 65536): Promise<string> {
    if (!(await lstat(path)).isFile() || await realpath(path) !== path) return invalid()
    const file = await open(path, 'r')
    try {
        if ((await file.stat()).size > maximumBytes) return invalid()
        const bytes = await file.readFile()
        if (bytes.length > maximumBytes) return invalid()
        return bytes.toString('utf8')
    } finally { await file.close() }
}
function object(value: unknown, fields: readonly string[]): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !fields.includes(key))) return invalid()
    return value as Record<string, unknown>
}
export function localKeyPath(root: string, path: unknown): string {
    if (typeof path !== 'string' || path.length === 0 || isAbsolute(path) || path.includes('\\') || path.includes(':')) return invalid()
    const target = resolve(root, path), distance = relative(root, target)
    if (!distance || distance === '..' || distance.startsWith(`..${sep}`) || isAbsolute(distance)) return invalid()
    return target
}
export async function readLocalKeySettings(path: string, environment: Environment): Promise<LocalKeySettings> {
    assertLocalKeyEnvironment(environment)
    try {
        const root = dirname(path)
        const input = object(JSON.parse(await readLocalKeyFile(path)), ['schemaVersion', 'environment', 'currentDirectory', 'historyDirectory', 'materialEnvironmentFile', 'bindings'])
        if (input.schemaVersion !== 1 || input.environment !== environment || !Array.isArray(input.bindings) || input.bindings.length > 256) return invalid()
        for (const field of ['currentDirectory', 'historyDirectory', 'materialEnvironmentFile']) localKeyPath(root, input[field])
        const references = new Set<string>(), locations = new Set<string>()
        const bindings = input.bindings.map(value => {
            const binding = object(value, ['purpose', 'algorithm', 'reference', 'version', 'publicKeyFile', 'privateKeyFile', 'secretEnvironmentVariable', 'encoding'])
            if (!Object.values(TokenType).includes(binding.purpose as TokenType)
                || binding.algorithm !== jwtKeyAlgorithms[binding.purpose as TokenType]
                || typeof binding.reference !== 'string' || !alias.test(binding.reference)
                || typeof binding.version !== 'string' || !alias.test(binding.version)) return invalid()
            const identity = JSON.stringify([binding.reference, binding.version])
            if (references.has(identity)) return invalid()
            references.add(identity)
            if (binding.algorithm === 'RS256') {
                if (binding.encoding !== undefined || binding.secretEnvironmentVariable !== undefined) return invalid()
                for (const field of ['publicKeyFile', 'privateKeyFile']) {
                    const file = localKeyPath(root, binding[field])
                    if (locations.has(file)) return invalid()
                    locations.add(file)
                }
            } else {
                if (binding.publicKeyFile !== undefined || binding.privateKeyFile !== undefined
                    || !['base64', 'utf8'].includes(binding.encoding as string)
                    || typeof binding.secretEnvironmentVariable !== 'string' || !/^JWT_LOCAL_[A-Z0-9_]{1,160}$/.test(binding.secretEnvironmentVariable)
                    || locations.has(binding.secretEnvironmentVariable)) return invalid()
                locations.add(binding.secretEnvironmentVariable)
            }
            return Object.freeze({ ...binding }) as unknown as LocalKeyBinding
        })
        return Object.freeze({ ...input, bindings: Object.freeze(bindings) }) as unknown as LocalKeySettings
    } catch { return invalid() }
}

/** Local-only, explicit descriptor; dotenv is parsed in memory and never assigned to process environment. */
export class LocalJwtKeyMaterialSource implements JwtKeyMaterialSource {
    private readonly identities = new Map<string, string>()
    constructor(private readonly path: string, private readonly initial: LocalKeySettings) {
        for (const binding of initial.bindings) this.remember(binding)
    }
    private remember(binding: LocalKeyBinding): void {
        const identity = JSON.stringify([binding.reference, binding.version])
        const metadata = JSON.stringify([binding.purpose, binding.algorithm, binding.publicKeyFile,
            binding.privateKeyFile, binding.secretEnvironmentVariable, binding.encoding])
        const previous = this.identities.get(identity)
        if (previous !== undefined && previous !== metadata) throw new Error()
        this.identities.set(identity, metadata)
    }
    async resolve(request: JwtKeyMaterialRequest): Promise<JwtKeyMaterial> {
        try {
            const settings = await readLocalKeySettings(this.path, this.initial.environment)
            if (request.environment !== settings.environment || settings.currentDirectory !== this.initial.currentDirectory
                || settings.historyDirectory !== this.initial.historyDirectory || settings.materialEnvironmentFile !== this.initial.materialEnvironmentFile) throw new Error()
            const binding = settings.bindings.find(entry => entry.reference === request.material.reference && entry.version === request.material.version)
            if (!binding || binding.algorithm !== request.algorithm || binding.purpose !== request.purpose) throw new Error()
            this.remember(binding)
            const root = dirname(this.path)
            if (binding.algorithm === 'RS256') return { algorithm: 'RS256', encoding: 'pem',
                publicKey: await readLocalKeyFile(localKeyPath(root, binding.publicKeyFile), 32768),
                privateKey: await readLocalKeyFile(localKeyPath(root, binding.privateKeyFile), 32768) }
            const values = parseEnv(await readLocalKeyFile(localKeyPath(root, settings.materialEnvironmentFile)))
            const secret = values[binding.secretEnvironmentVariable!]
            if (typeof secret !== 'string' || secret.length === 0) throw new Error()
            return { algorithm: 'HS512', encoding: binding.encoding!, secret }
        } catch { throw new JwtKeyMaterialSourceError('UNAVAILABLE') }
    }
}
export async function createLocalJwtKeyRuntime(path: string, environment: Environment): Promise<JwtKeyRuntimeOptions & { readonly localPaths: JwtKeyRegistryPaths }> {
    assertLocalKeyEnvironment(environment)
    try {
        const absolute = resolve(path), settings = await readLocalKeySettings(absolute, environment), root = dirname(absolute)
        const localPaths = Object.freeze({ currentDirectory: localKeyPath(root, settings.currentDirectory), historyDirectory: localKeyPath(root, settings.historyDirectory) })
        return { localPaths, manifestSource: new JwtKeyFileRegistry(localPaths, environment), materialSource: new LocalJwtKeyMaterialSource(absolute, settings) }
    } catch { return invalid() }
}
