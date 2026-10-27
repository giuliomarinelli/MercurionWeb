import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { resolve, relative, isAbsolute, sep, dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { createConfigurationModule } from './config/configuration.module'
import { ConfigurationError } from './config/env-validation'
import { resolveAppEnv } from './utils/env-helpers'
import { TokenType } from './app_modules/auth/models/enums/token-type.enum'
import { JwtKeysProvider } from './app_modules/auth/providers/jwt-keys.provider'
import { assertLocalKeyEnvironment, JwtLocalKeyError } from './app_modules/auth/keys/jwt-key-local.source'
import { generateLocalJwtKey, migrateLocalJwtKeys } from './app_modules/auth/keys/jwt-key-local.setup'
import { JwtKeyRuntimeError } from './app_modules/auth/keys/jwt-key-runtime-error'
import { JwtKeyManifestValidationError } from './app_modules/auth/keys/jwt-key-manifest.parser'

interface Output { out(value: string): void; error(value: string): void }
function assertSafeLocalDestination(target: string): void {
    const gitRoot = (start: string): string | undefined => {
        let directory = resolve(start)
        while (!existsSync(join(directory, '.git')) && dirname(directory) !== directory) directory = dirname(directory)
        return existsSync(join(directory, '.git')) ? directory : undefined
    }
    const repository = gitRoot(process.cwd()), destinationRepository = gitRoot(target)
    if (destinationRepository !== undefined && destinationRepository !== repository) throw new JwtLocalKeyError('INVALID_CONFIGURATION')
    const root = repository ?? process.cwd()
    const inside = (parent: string, child: string) => { const distance = relative(parent, child); return !isAbsolute(distance) && distance !== '..' && !distance.startsWith(`..${sep}`) }
    const ignored = repository ? resolve(root, 'MercurionWebNode/.local') : resolve(root, '.local')
    if (inside(root, target) && (target === ignored || !inside(ignored, target))) throw new JwtLocalKeyError('INVALID_CONFIGURATION')
}
export async function runJwtLocalCli(argv: readonly string[], output: Output, configuration?: () => Promise<ConfigService>): Promise<number> {
    let close: (() => Promise<void>) | undefined
    try {
        const [command, ...args] = argv
        const allowed = command === 'init' ? ['directory', 'at', 'apply', 'legacy-accept-until', 'http-refresh-until'] : command === 'new-key' ? ['config', 'purpose', 'kid'] : []
        if (allowed.length === 0) throw new JwtLocalKeyError('INVALID_CONFIGURATION')
        const options = new Map<string, string>()
        for (let index = 0; index < args.length; index += 2) {
            const name = args[index]?.slice(2), value = args[index + 1]
            if (!args[index]?.startsWith('--') || !allowed.includes(name) || options.has(name) || !value || value.startsWith('--')) throw new JwtLocalKeyError('INVALID_CONFIGURATION')
            options.set(name, value)
        }
        let config: ConfigService
        if (configuration) config = await configuration()
        else {
            assertLocalKeyEnvironment(resolveAppEnv())
            // Configuration only: no AppModule, database, NATS, Redis or application listener.
            const context = await NestFactory.createApplicationContext(await createConfigurationModule(), { logger: false, abortOnError: false })
            close = () => context.close()
            config = context.get(ConfigService)
        }
        const environment = config.getOrThrow('App.env')
        assertLocalKeyEnvironment(environment)
        if (command === 'init') {
            if (config.get<string>('Jwt.localKeysConfig')) throw new JwtLocalKeyError('CONFLICT')
            const directory = resolve(options.get('directory') ?? `.local/jwt-keys/${environment}`)
            assertSafeLocalDestination(directory)
            if (options.has('apply') && !options.has('at')) throw new JwtLocalKeyError('INVALID_CONFIGURATION')
            const keys = new JwtKeysProvider(config)
            const preview = await migrateLocalJwtKeys({ config, directory, at: options.get('at') ?? new Date().toISOString(),
                http: keys.getAccessKeyPair(), ws: keys.getWsKeyPair(), legacyAcceptUntil: options.get('legacy-accept-until'),
                httpRefreshUntil: options.get('http-refresh-until') }, options.get('apply'))
            output.out(JSON.stringify(preview))
        } else {
            const path = options.get('config'), purpose = options.get('purpose') as TokenType, kid = options.get('kid')
            if (!path || !kid) throw new JwtLocalKeyError('INVALID_CONFIGURATION')
            output.out(JSON.stringify(await generateLocalJwtKey(path, environment, purpose, kid)))
        }
        return 0
    } catch (error) {
        output.error(error instanceof JwtLocalKeyError || error instanceof JwtKeyRuntimeError || error instanceof JwtKeyManifestValidationError ? error.message
            : error instanceof ConfigurationError ? `Local JWT configuration invalid: ${error.diagnostics.map(diagnostic => diagnostic.source).join(', ')}`
                : 'Local JWT key operation failed')
        return 1
    } finally { await close?.() }
}
if (require.main === module) {
    void runJwtLocalCli(process.argv.slice(2), { out: value => process.stdout.write(`${value}\n`), error: value => process.stderr.write(`${value}\n`) })
        .then(code => { process.exitCode = code })
}
