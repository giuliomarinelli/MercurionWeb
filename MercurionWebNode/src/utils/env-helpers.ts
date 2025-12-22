import { Environment } from "src/config/config";

export function resolveAppEnv(): Environment {
    const raw = process.env.APP_ENV ?? Environment.Development
    return Object.values(Environment).includes(raw as Environment)
        ? (raw as Environment)
        : Environment.Development
}

export function shouldUseEnvFile(appEnv: Environment): boolean {
    return appEnv === Environment.Development || appEnv === Environment.Test
}