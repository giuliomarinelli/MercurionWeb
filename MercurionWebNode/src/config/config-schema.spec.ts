import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

import { configurationBuilders } from './config.model'
import {
  ConfigKey,
  defineEnvironmentSchema,
  environmentProperty,
  environmentSchema,
  type EnvironmentProperty,
  type RawEnvironment,
  type ValidatedEnvironment
} from './config.schema'
import { validateEnvironment } from './env-validation'

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
