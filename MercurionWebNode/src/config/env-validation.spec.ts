import {
  Environment,
  environmentSchema,
  type EnvironmentProperty,
  type RawEnvironment
} from './config.schema'
import {
  validateEnvironment,
  validateEnvOrKillProcess
} from './env-validation'

function rawExample(property: EnvironmentProperty): string {
  if (property.parser.kind === 'json-string-list') {
    return JSON.stringify(property.parser.example)
  }
  return String(property.parser.example)
}

function validRawEnvironment(includeOptional: boolean): RawEnvironment {
  return Object.fromEntries(
    environmentSchema.entries
      .filter(property => includeOptional || property.required)
      .map(property => [property.source, rawExample(property)])
  )
}

describe('canonical environment validation', () => {
  it('coerces a full valid environment exactly once', () => {
    const environment = validateEnvironment(validRawEnvironment(true))

    expect(environment.APP_PORT).toBe(1)
    expect(environment.SQL_DATABASE_SYNCHRONIZE).toBe(true)
    expect(environment.APP_CORS_ORIGINS).toEqual(['http://localhost'])
    expect(environment.APP_ENV).toBe(Environment.Development)
  })

  it('accepts the minimal required environment and applies declared safe defaults', () => {
    const environment = validateEnvironment(validRawEnvironment(false))

    expect(environment).toEqual(expect.objectContaining({
      APP_ENV: Environment.Development,
      NODE_ENV: 'development',
      LOCAL_DUMMY_AUTH: false,
      DISABLE_TURNSTILE: false,
      LOCAL_TEST_ACCOUNT_EMAIL: undefined,
      APP_VERSION: undefined
    }))
  })

  it('reports every missing required property without terminating the process', () => {
    expect(() => validateEnvOrKillProcess({})).toThrow(
      /APP_PORT: is required/
    )
  })

  it.each([
    ['integer', 'APP_PORT', '1.5'],
    ['positive integer', 'REDIS_PORT', '0'],
    ['boolean', 'SECURE_COOKIE_SECURE', 'yes'],
    ['JSON string list', 'APP_CORS_ORIGINS', '{"origin":"http://localhost"}'],
    ['database enum', 'SQL_DATABASE_TYPE', 'sqlite'],
    ['cookie enum', 'SECURE_COOKIE_SAME_SITE', 'sometimes'],
    ['UUID', 'APP_PROJECT_ID', 'not-a-uuid']
  ])('rejects an invalid %s', (_case, source, invalidValue) => {
    const raw = validRawEnvironment(true)
    raw[source] = invalidValue

    expect(() => validateEnvironment(raw)).toThrow(source)
  })
})
