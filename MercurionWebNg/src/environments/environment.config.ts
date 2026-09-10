export const environmentNames = ['development', 'testing', 'staging', 'production'] as const

export type EnvironmentName = typeof environmentNames[number]

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'off'

export interface EnvironmentConfig {
  readonly name: EnvironmentName
  readonly minLogLevel: LogLevel
  readonly CLOUDFLARE_SITE_KEY: string
  readonly DISABLE_TURNSTILE: boolean
  readonly logoSrc: Readonly<{
    readonly PICTOGRAM_LIGHT: string
    readonly PICTOGRAM_DARK: string
  }>
  readonly production: boolean
  readonly testing: boolean
}

type EnvironmentConfigDefinition = Omit<EnvironmentConfig, 'production' | 'testing'>

export function createEnvironmentConfig(config: EnvironmentConfigDefinition): EnvironmentConfig {
  const environment = {
    ...config,
    logoSrc: Object.freeze({ ...config.logoSrc }),
    production: config.name === 'production',
    testing: config.name === 'testing'
  } satisfies EnvironmentConfig

  assertValidEnvironmentConfig(environment)

  return Object.freeze(environment)
}

export function assertValidEnvironmentConfig(config: EnvironmentConfig): void {
  const expectedProduction = config.name === 'production'
  const expectedTesting = config.name === 'testing'

  if (config.production !== expectedProduction) {
    throw new Error(`Environment "${config.name}" has inconsistent production flag`)
  }

  if (config.testing !== expectedTesting) {
    throw new Error(`Environment "${config.name}" has inconsistent testing flag`)
  }

  if (config.production && config.testing) {
    throw new Error(`Environment "${config.name}" cannot be both production and testing`)
  }
}
