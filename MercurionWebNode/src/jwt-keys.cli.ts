import { open } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { Environment } from './config/config.schema'
import { JwtKeyFileRegistry, JwtKeyRegistryError } from './app_modules/auth/keys/jwt-key-registry'
import { JwtKeyAdministration, type JwtKeyAdministrationRequest } from './app_modules/auth/keys/jwt-key-administration'
import { parseJwtKeyManifest } from './app_modules/auth/keys/jwt-key-manifest.parser'
import type { JwtKeyMaterialSource } from './app_modules/auth/keys/jwt-key-material-source.port'
import { createLocalJwtKeyRuntime } from './app_modules/auth/keys/jwt-key-local.source'
import { resolve } from 'node:path'

interface CliOutput { out(value: string): void; error(value: string): void }

/** Metadata-only CLI. A future trusted Secret Manager bootstrap can supply materialSource in process memory. */
export async function runJwtKeysCli(argv: readonly string[], output: CliOutput, materialSource?: JwtKeyMaterialSource): Promise<number> {
    try {
        const [command, ...args] = argv
        const accepted: Record<string, readonly string[]> = {
            inspect: [], validate: [], initialize: ['manifest', 'apply'],
            change: ['request', 'apply'], 'recover-latest': ['expected-revision', 'apply']
        }
        if (!Object.hasOwn(accepted, command)) throw new Error('Invalid command')
        const options = new Map<string, string>()
        for (let index = 0; index < args.length; index += 2) {
            const name = args[index]?.slice(2); const value = args[index + 1]
            if (!args[index]?.startsWith('--') || !['current', 'history', 'env', 'local-config', ...accepted[command]].includes(name)
                || options.has(name) || !value || value.startsWith('--')) throw new Error('Invalid argument')
            options.set(name, value)
        }
        const environment = options.get('env') as Environment
        if (!Object.values(Environment).includes(environment)) throw new Error('Invalid environment')
        const registry = new JwtKeyFileRegistry({ currentDirectory: options.get('current') ?? '', historyDirectory: options.get('history') ?? '' }, environment)
        if (options.has('local-config')) {
            if (materialSource !== undefined) throw new JwtKeyRegistryError('CONFLICT')
            const local = await createLocalJwtKeyRuntime(options.get('local-config')!, environment)
            // Bind to this registry, rather than silently borrowing material from another local store.
            if (local.localPaths.currentDirectory !== resolve(options.get('current')!)
                || local.localPaths.historyDirectory !== resolve(options.get('history')!)) throw new JwtKeyRegistryError('CONFLICT')
            materialSource = local.materialSource
        }
        if (command === 'inspect' || command === 'validate') {
            const manifest = await registry.read()
            output.out(JSON.stringify({ environment, revision: manifest.revision, lastOperation: manifest.lastOperation,
                domains: manifest.domains.map(domain => ({ purpose: domain.purpose, issuance: domain.issuance, activeKid: domain.activeKid,
                    keys: domain.keys.map(key => ({ kid: key.kid, state: key.state })) })) }))
        } else if (command === 'initialize') {
            const manifest = parseJwtKeyManifest(await jsonInput(options.get('manifest')), environment)
            // Provisioning material requires the material-source preflight, so the standalone CLI starts suspended/empty.
            if (manifest.domains.some(domain => domain.issuance !== 'suspended' || domain.keys.length !== 0)) throw new JwtKeyRegistryError('INVALID_TRANSITION')
            const hash = createHash('sha256').update(JSON.stringify(manifest)).digest('hex')
            const approval = options.get('apply')
            if (approval !== undefined) {
                if (approval !== hash) throw new JwtKeyRegistryError('CONFLICT')
                await registry.initialize(manifest)
            }
            output.out(JSON.stringify({ revision: 1, digest: hash, applied: approval !== undefined }))
        } else if (command === 'change') {
            const request = await jsonInput(options.get('request')) as JwtKeyAdministrationRequest
            const preview = await new JwtKeyAdministration(registry, environment, materialSource).change(request, options.get('apply'))
            output.out(JSON.stringify({ ...preview, applied: options.has('apply') }))
        } else {
            const revision = Number(options.get('expected-revision'))
            if (!Number.isSafeInteger(revision) || revision < 1) throw new Error('Invalid revision')
            // Recovery is deliberately explicit; inspect the protected history first, then confirm its exact head revision.
            if (options.get('apply') !== `revision-${revision}`) throw new JwtKeyRegistryError('CONFLICT')
            const manifest = await registry.recoverLatest(revision)
            output.out(JSON.stringify({ revision: manifest.revision, recovered: true }))
        }
        return 0
    } catch (error) {
        output.error(error instanceof JwtKeyRegistryError ? error.message : 'JWT key administration failed')
        return 1
    }
}

async function jsonInput(path: string | undefined): Promise<unknown> {
    if (!path) throw new Error('Input required')
    const file = await open(path, 'r')
    try {
        if ((await file.stat()).size > 256 * 1024) throw new Error('Input too large')
        const contents = await file.readFile()
        if (contents.length > 256 * 1024) throw new Error('Input too large')
        return JSON.parse(contents.toString('utf8'))
    } finally { await file.close() }
}

if (require.main === module) {
    void runJwtKeysCli(process.argv.slice(2), { out: value => process.stdout.write(`${value}\n`), error: value => process.stderr.write(`${value}\n`) })
        .then(code => { process.exitCode = code })
}
