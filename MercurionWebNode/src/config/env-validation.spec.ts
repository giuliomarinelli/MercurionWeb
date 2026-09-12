import {
  Environment,
  environmentSchema,
  type EnvironmentProperty,
  type RawEnvironment
} from './config.schema'
import {
  ConfigurationError,
  validateEnvironment,
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
    const exit = jest.spyOn(process, 'exit').mockImplementation(code => {
      throw new Error(`unexpected process.exit(${String(code)})`)
    })

    expect(() => validateEnvironment({})).toThrow(ConfigurationError)
    expect(() => validateEnvironment({})).toThrow(/APP_PORT: is required/)
    expect(exit).not.toHaveBeenCalled()

    exit.mockRestore()
  })

  it('exposes structured diagnostics without including rejected values', () => {
    const raw = validRawEnvironment(true)
    raw.APP_PORT = 'not-a-secret-safe-value'

    try {
      validateEnvironment(raw)
      throw new Error('Expected validation to fail')
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigurationError)
      expect((error as ConfigurationError).diagnostics).toContainEqual({
        source: 'APP_PORT',
        message: 'must be an integer greater than or equal to 1'
      })
      expect((error as Error).message).not.toContain('not-a-secret-safe-value')
    }
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

  it.each([
    ['missing host', 'APP_NATS_HOST', undefined],
    ['missing port', 'APP_NATS_PORT', undefined],
    ['missing protocol', 'APP_NATS_HOST', 'localhost'],
    ['unsupported protocol', 'APP_NATS_HOST', 'http://localhost'],
    ['embedded port', 'APP_NATS_HOST', 'nats://localhost:4223'],
    ['credentials', 'APP_NATS_HOST', 'nats://user:password@localhost'],
    ['path', 'APP_NATS_HOST', 'nats://localhost/messages'],
    ['surrounding whitespace', 'APP_NATS_HOST', ' nats://localhost'],
    ['out-of-range port', 'APP_NATS_PORT', '65536']
  ])('fails closed for invalid NATS endpoint data: %s', (_case, source, value) => {
    const raw = validRawEnvironment(true)
    raw[source] = value

    expect(() => validateEnvironment(raw)).toThrow(source)
  })
})
