export const environmentNames = ['development', 'testing', 'staging', 'production'] as const

export type EnvironmentName = typeof environmentNames[number]

export interface EnvironmentConfig {
  readonly name: EnvironmentName
  readonly CLOUDFLARE_SITE_KEY: string
  readonly PUBLIC_EXACT_PATHS: readonly string[]
  readonly LOGGED_OUT_ONLY_PATHS: readonly string[]
  readonly PUBLIC_PREFIXES: readonly string[]
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
    PUBLIC_EXACT_PATHS: freezeList(config.PUBLIC_EXACT_PATHS),
    LOGGED_OUT_ONLY_PATHS: freezeList(config.LOGGED_OUT_ONLY_PATHS),
    PUBLIC_PREFIXES: freezeList(config.PUBLIC_PREFIXES),
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

function freezeList<T>(values: readonly T[]): readonly T[] {
  return Object.freeze([...values])
}

