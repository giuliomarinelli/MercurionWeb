import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

import { configurationBuilders } from './config.model'
import {
  ConfigKey,
  Environment,
  defineEnvironmentSchema,
  environmentProperty,
  environmentSchema,
  type EnvironmentProperty,
  type RawEnvironment,
  type ValidatedEnvironment
} from './config.schema'
import { validateEnvironment } from './env-validation'
import {
  formatNatsServerUrlForLog,
  type NatsServerUrl
} from './nats-endpoint'

function rawExample(property: EnvironmentProperty): string {
  if (property.parser.kind === 'json-string-list') {
    return JSON.stringify(property.parser.example)
  }
  return String(property.parser.example)
}

function fullEnvironment(): ValidatedEnvironment {
  const raw = Object.fromEntries(
    environmentSchema.entries.map(property => [
      property.source,
      rawExample(property)
    ])
  ) as RawEnvironment
  return validateEnvironment(raw)
}

function typescriptFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const path = join(directory, entry)
    return statSync(path).isDirectory()
      ? typescriptFiles(path)
      : path.endsWith('.ts') && !path.endsWith('.spec.ts')
        ? [path]
        : []
  })
}

describe('canonical configuration schema', () => {
  it('rejects duplicate source declarations', () => {
    const appPort = environmentProperty('APP_PORT')
    expect(() => defineEnvironmentSchema(appPort, appPort)).toThrow(
      'Duplicate environment source: APP_PORT'
    )
  })

  it('has a builder for every public configuration group', () => {
    expect(Object.keys(configurationBuilders).sort()).toEqual(
      Object.values(ConfigKey).sort()
    )
  })

  it('uses every declared environment property in a typed configuration group', () => {
    const accessed = new Set<string>()
    const environment = new Proxy(fullEnvironment(), {
      get(target, property, receiver) {
        if (typeof property === 'string') accessed.add(property)
        return Reflect.get(target, property, receiver)
      }
    })

    Object.values(configurationBuilders).forEach(builder => builder(environment))

    expect(
      environmentSchema.sources.filter(source => !accessed.has(source))
    ).toEqual([])
  })

  it('keeps production consumers away from raw process environment values', () => {
    const sourceRoot = join(process.cwd(), 'src')
    const allowed = new Set([
      'config/env-validation.ts',
      'utils/env-helpers.ts'
    ])
    const violations = typescriptFiles(sourceRoot).flatMap(file => {
      const path = relative(sourceRoot, file).replaceAll('\\', '/')
      if (allowed.has(path)) return []
      return readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .map((line, index) => ({ line, lineNumber: index + 1, path }))
        .filter(({ line }) =>
          !line.trimStart().startsWith('//') && /process\.env/.test(line)
        )
    })

    expect(violations).toEqual([])
  })

  it('keeps NATS consumers on the canonical URL without local port fallbacks', () => {
    const violations = typescriptFiles(join(process.cwd(), 'src')).flatMap(file =>
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .map((line, index) => ({
          line: line.trim(),
          lineNumber: index + 1,
          path: relative(process.cwd(), file).replaceAll('\\', '/')
        }))
        .filter(({ line }) =>
          /App\.nats(?:Host|Port)|\?\?\s*422[23]/.test(line)
        )
    )

    expect(violations).toEqual([])
  })

  it('forbids process termination from importable configuration modules', () => {
    const files = [
      ...typescriptFiles(join(process.cwd(), 'src', 'config')),
      join(process.cwd(), 'src', 'utils', 'env-helpers.ts')
    ]
    const violations = files.flatMap(file =>
      readFileSync(file, 'utf8')
        .split(/\r?\n/)
        .map((line, index) => ({
          line: line.trim(),
          lineNumber: index + 1,
          path: relative(process.cwd(), file).replaceAll('\\', '/')
        }))
        .filter(({ line }) => /process\.exit\s*\(/.test(line))
    )

    expect(violations).toEqual([])
  })

  it.each([
    {
      appEnv: Environment.Development,
      environment: 'local Docker host mapping',
      host: 'nats://localhost',
      port: '4223',
      expected: 'nats://localhost:4223'
    },
    {
      appEnv: Environment.Test,
      environment: 'test configuration',
      host: 'nats://localhost',
      port: '14223',
      expected: 'nats://localhost:14223'
    },
    {
      appEnv: Environment.Staging,
      environment: 'Kubernetes service',
      host: 'nats://nats-sl.mercurion-beta.svc.cluster.local',
      port: '4222',
      expected: 'nats://nats-sl.mercurion-beta.svc.cluster.local:4222'
    },
    {
      appEnv: Environment.Production,
      environment: 'production configuration',
      host: 'tls://nats.example.test',
      port: '5222',
      expected: 'tls://nats.example.test:5222'
    }
  ])('derives one canonical NATS URL for $environment', ({
    appEnv,
    host,
    port,
    expected
  }) => {
    const raw = Object.fromEntries(
      environmentSchema.entries.map(property => [
        property.source,
        rawExample(property)
      ])
    ) as RawEnvironment
    raw.APP_ENV = appEnv
    raw.APP_NATS_HOST = host
    raw.APP_NATS_PORT = port

    const environment = validateEnvironment(raw)
    const app = configurationBuilders[ConfigKey.App](environment)

    expect(app.natsUrl).toBe(expected)
    expect(app).not.toHaveProperty('natsHost')
    expect(app).not.toHaveProperty('natsPort')
  })

  it('redacts future NATS credentials from the log representation', () => {
    const endpoint = new URL('nats://nats.example.test:4222')
    endpoint.username = 'service-account'
    endpoint.password = 'credential'
    const authenticated = endpoint.toString() as NatsServerUrl

    expect(formatNatsServerUrlForLog(authenticated)).toBe(
      'nats://nats.example.test:4222'
    )
  })

  it('declares every application environment source shipped in the example file', () => {
    const example = readFileSync(join(process.cwd(), 'env', '.env.example'), 'utf8')
    const exampleSources = new Set(
      example
        .split(/\r?\n/)
        .map(line => line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=/)?.[1])
        .filter((source): source is string => source !== undefined)
    )

    expect(
      environmentSchema.entries
        .filter(property => property.required)
        .map(property => property.source)
        .filter(source => !exampleSources.has(source))
    ).toEqual([])
  })
})
