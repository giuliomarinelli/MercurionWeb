import { type DynamicModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { join } from 'node:path'

import { createConfigurations } from './config'
import {
    type RawEnvironment,
    type ValidatedEnvironment
} from './config.schema'
import {
    ConfigurationError,
    validateEnvironment
} from './env-validation'
import {
    parseAppEnv,
    resolveAppEnv,
    shouldUseEnvFile
} from '../utils/env-helpers'

export interface ConfigurationModuleOptions {
    readonly environment?: RawEnvironment
    readonly cwd?: string
}

export function createConfigurationModule(
    options: ConfigurationModuleOptions = {}
): Promise<DynamicModule> {
    const appEnv = options.environment === undefined
        ? resolveAppEnv()
        : parseAppEnv(options.environment.APP_ENV)
    const useEnvFile =
        options.environment === undefined && shouldUseEnvFile(appEnv)
    let validatedEnvironment: ValidatedEnvironment | undefined

    return ConfigModule.forRoot({
        isGlobal: true,
        ignoreEnvFile: !useEnvFile,
        envFilePath: useEnvFile
            ? join(options.cwd ?? process.cwd(), 'env', `.env.${appEnv}`)
            : undefined,
        load: createConfigurations(() => {
            if (validatedEnvironment === undefined) {
                throw new ConfigurationError([{
                    source: 'CONFIGURATION',
                    message: 'was consumed before validation completed'
                }])
            }
            return validatedEnvironment
        }),
        expandVariables: true,
        cache: false,
        validate: config => {
            validatedEnvironment = validateEnvironment(
                options.environment ?? config as RawEnvironment
            )
            return validatedEnvironment
        }
    })
}
