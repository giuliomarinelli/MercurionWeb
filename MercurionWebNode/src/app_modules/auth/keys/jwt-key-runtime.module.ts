import { DynamicModule, Global, Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import type { JwtKeyMaterialSource } from './jwt-key-material-source.port'
import type { Environment } from 'src/config/config.schema'
import { JwtKeyFileRegistry, type JwtKeyRegistryPaths } from './jwt-key-registry'
import { createLocalJwtKeyRuntime } from './jwt-key-local.source'

export const JWT_KEY_RUNTIME_OPTIONS = Symbol('JWT_KEY_RUNTIME_OPTIONS')

/** Fresh decoded metadata per read; no token/header is passed to this source. */
export interface JwtKeyManifestSource {
    read(): Promise<unknown>
}

export interface JwtKeyRuntimeOptions {
    readonly manifestSource: JwtKeyManifestSource
    readonly materialSource: JwtKeyMaterialSource
}

/** Explicit application composition; absence preserves the existing migration path. */
@Global()
@Module({})
export class JwtKeyRuntimeModule {
    static registerLocal(): DynamicModule {
        return { module: JwtKeyRuntimeModule, imports: [ConfigModule], providers: [{ provide: JWT_KEY_RUNTIME_OPTIONS,
            inject: [ConfigService], useFactory: async (config: ConfigService): Promise<JwtKeyRuntimeOptions | undefined> => {
                const path = config.get<string>('Jwt.localKeysConfig')
                return path ? createLocalJwtKeyRuntime(path, config.getOrThrow<Environment>('App.env')) : undefined
            } }], exports: [JWT_KEY_RUNTIME_OPTIONS] }
    }

    static fromFiles(paths: JwtKeyRegistryPaths, environment: Environment, materialSource: JwtKeyMaterialSource): JwtKeyRuntimeOptions {
        return { manifestSource: new JwtKeyFileRegistry(paths, environment), materialSource }
    }

    static register(options: JwtKeyRuntimeOptions): DynamicModule {
        if (!options?.manifestSource || typeof options.manifestSource.read !== 'function'
            || !options.materialSource || typeof options.materialSource.resolve !== 'function') {
            throw new Error('JWT key runtime requires both metadata and material sources')
        }
        return {
            module: JwtKeyRuntimeModule,
            providers: [{ provide: JWT_KEY_RUNTIME_OPTIONS, useValue: Object.freeze({ ...options }) }],
            exports: [JWT_KEY_RUNTIME_OPTIONS]
        }
    }
}
