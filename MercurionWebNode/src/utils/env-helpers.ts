import { Environment } from 'src/config/config'

export function parseAppEnv(raw: unknown): Environment {
    const value = (typeof raw === 'string' ? raw : undefined) ?? Environment.Development
    return Object.values(Environment).includes(value as Environment)
        ? (value as Environment)
        : Environment.Development
}

export function resolveAppEnv(): Environment {
    return parseAppEnv(process.env.APP_ENV)
}

export function shouldUseEnvFile(appEnv: Environment): boolean {
    return appEnv === Environment.Development || appEnv === Environment.Test
}
