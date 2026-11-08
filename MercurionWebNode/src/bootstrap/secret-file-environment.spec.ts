import * as fs from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { runSecretFileBootstrap } from '../bootstrap-secrets.cli'
import { legacyJwtSecretSources } from '../config/config.schema'
import {
  loadSecretFileEnvironment, maximumBootstrapBytes, parseSecretEnvironment,
  SecretBootstrapError, secretBootstrapFileVariable
} from './secret-file-environment'

describe('opt-in secret file bootstrap', () => {
  const marker = 'synthetic-only-$PATH-${HOME}'
  let directory: string
  const payload = (variables: Record<string, unknown> = { APP_PASSWORD_PEPPER: marker }, environment = 'staging') =>
    Buffer.from(JSON.stringify({ schemaVersion: 1, environment, variables }))
  const write = (bytes = payload()) => {
    const path = join(directory, 'synthetic.json')
    fs.writeFileSync(path, bytes, { mode: 0o600 })
    return path
  }

  beforeEach(() => {
    directory = fs.realpathSync(fs.mkdtempSync(join(tmpdir(), 'mercurion-secret-bootstrap-')))
  })
  afterEach(() => {
    jest.restoreAllMocks()
    process.exitCode = undefined
    expect(dirname(directory)).toBe(fs.realpathSync(tmpdir()))
    expect(basename(directory)).toMatch(/^mercurion-secret-bootstrap-/)
    fs.rmSync(directory, { recursive: true, force: true })
  })

  it('loads literal values without interpolation and preserves existing non-secret configuration', () => {
    const environment: NodeJS.ProcessEnv = { APP_ENV: 'staging', NODE_ENV: 'production',
      [secretBootstrapFileVariable]: write() }
    loadSecretFileEnvironment(environment)
    expect(environment.APP_PASSWORD_PEPPER).toBe(marker)
    expect(environment.APP_ENV).toBe('staging')
    expect(environment.NODE_ENV).toBe('production')
    expect(fs.existsSync(environment[secretBootstrapFileVariable] as string)).toBe(true)
  })

  it('supports the existing 13 HMAC sources and four base64 RSA variables', () => {
    const variables = Object.fromEntries(legacyJwtSecretSources.map(name => [name, marker]))
    for (const name of ['JWT_RS256_PRIVATE_KEY_B64', 'JWT_RS256_PUBLIC_KEY_B64',
      'JWT_WS_RS256_PRIVATE_KEY_B64', 'JWT_WS_RS256_PUBLIC_KEY_B64']) variables[name] = marker
    expect(Object.keys(parseSecretEnvironment(payload(variables), { APP_ENV: 'staging' }))).toHaveLength(17)
  })

  it('injects distinct search and writer keys from the same private bootstrap file', () => {
    const environment: NodeJS.ProcessEnv = { APP_ENV: 'staging',
      [secretBootstrapFileVariable]: write(payload({
        MEILISEARCH_MASTER_KEY: 'synthetic-search-key', MEILISEARCH_LOG_KEY: 'synthetic-writer-key'
      })) }
    loadSecretFileEnvironment(environment)
    expect(environment.MEILISEARCH_MASTER_KEY).toBe('synthetic-search-key')
    expect(environment.MEILISEARCH_LOG_KEY).toBe('synthetic-writer-key')
  })

  it.each(['NODE_OPTIONS', 'PATH', 'APP_ENV', 'NODE_ENV', 'JWT_LOCAL_KEYS_CONFIG', '__proto__', marker])(
    'rejects a protected or unknown variable without printing its name: %s', name => {
      const bytes = payload({ [name]: marker })
      expect(() => parseSecretEnvironment(bytes, { APP_ENV: 'staging' })).toThrow('unknown-variable')
      try { parseSecretEnvironment(bytes, { APP_ENV: 'staging' }) }
      catch (error) { expect(String(error)).not.toContain(marker) }
    }
  )

  it.each([null, false, 10, '', ' ', 'with\0nul', 'with\ud800surrogate'])('rejects a non-string/empty/NUL/ill-formed value: %s', value => {
    expect(() => parseSecretEnvironment(payload({ APP_PASSWORD_PEPPER: value }), { APP_ENV: 'staging' })).toThrow('invalid-value')
  })

  it.each([undefined, 'development', 'test', 'production'])('rejects environment mismatch or absent target: %s', APP_ENV => {
    expect(() => parseSecretEnvironment(payload(), { APP_ENV })).toThrow('environment-mismatch')
  })

  it('does not partially inject a payload with a later invalid entry', () => {
    const environment: NodeJS.ProcessEnv = { APP_ENV: 'staging',
      [secretBootstrapFileVariable]: write(payload({ APP_PASSWORD_PEPPER: marker, NODE_OPTIONS: marker })) }
    const before = { ...environment }
    expect(() => loadSecretFileEnvironment(environment)).toThrow(SecretBootstrapError)
    expect(environment).toEqual(before)
  })

  it('refuses pre-existing values instead of overriding even identical credentials', () => {
    expect(() => parseSecretEnvironment(payload(), { APP_ENV: 'staging', APP_PASSWORD_PEPPER: marker })).toThrow('environment-conflict')
  })

  it.each([Buffer.from('{broken-' + marker), Buffer.from([0xff]), Buffer.alloc(0),
    Buffer.alloc(maximumBootstrapBytes + 1), Buffer.from('[]'), payload({})])('rejects malformed or oversized documents', bytes => {
    expect(() => parseSecretEnvironment(bytes, { APP_ENV: 'staging' })).toThrow(SecretBootstrapError)
  })

  it('accepts UTF-8 BOM and multiline PEM values as literal data', () => {
    const pem = 'synthetic-first-line\nsynthetic-second-line\n'
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), payload({ JWT_RS256_PUBLIC_KEY: pem })])
    expect(parseSecretEnvironment(bytes, { APP_ENV: 'staging' }).JWT_RS256_PUBLIC_KEY).toBe(pem)
  })

  it('rejects directories and missing files without returning paths', () => {
    for (const path of [directory, join(directory, marker)]) {
      try {
        loadSecretFileEnvironment({ APP_ENV: 'staging', [secretBootstrapFileVariable]: path })
        throw new Error('expected rejection')
      } catch (error) {
        expect(error).toBeInstanceOf(SecretBootstrapError)
        expect(String(error)).not.toContain(directory)
        expect(String(error)).not.toContain(marker)
      }
    }
  })

  it('sanitizes read permission errors and leaves the environment unchanged', () => {
    const environment = { APP_ENV: 'staging', [secretBootstrapFileVariable]: write() }
    jest.spyOn(fs, 'openSync').mockImplementation(() => { throw new Error(marker) })
    expect(() => loadSecretFileEnvironment(environment)).toThrow('file-unreadable')
    expect(environment).not.toHaveProperty('APP_PASSWORD_PEPPER')
  })

  const posixTest = process.platform === 'win32' ? it.skip : it
  posixTest('rejects symlinks and world-readable/group-writable files on Linux', () => {
    const path = write()
    const link = join(directory, 'synthetic-link.json')
    fs.symlinkSync(path, link)
    expect(() => loadSecretFileEnvironment({ APP_ENV: 'staging', [secretBootstrapFileVariable]: link })).toThrow('file-type')
    for (const mode of [0o644, 0o660]) {
      fs.chmodSync(path, mode)
      expect(() => loadSecretFileEnvironment({ APP_ENV: 'staging', [secretBootstrapFileVariable]: path })).toThrow('file-permissions')
    }
  })

  it('starts the injected application only after successful loading', async () => {
    const environment = { APP_ENV: 'staging', [secretBootstrapFileVariable]: write() }
    const start = jest.fn(async () => { expect(environment).toHaveProperty('APP_PASSWORD_PEPPER', marker) })
    const report = jest.fn()
    await runSecretFileBootstrap(start, environment, report)
    expect(start).toHaveBeenCalledTimes(1)
    expect(report).not.toHaveBeenCalled()
  })

  it('does not start the application on rejection and reports no file content or path', async () => {
    const start = jest.fn()
    const report = jest.fn()
    await runSecretFileBootstrap(start, { APP_ENV: 'staging', [secretBootstrapFileVariable]: resolve(directory, marker) }, report)
    expect(start).not.toHaveBeenCalled()
    expect(report).toHaveBeenCalledWith({ code: 'INVALID_SECRET_BOOTSTRAP', reason: 'file-unreadable' })
    expect(JSON.stringify(report.mock.calls)).not.toContain(marker)
    expect(process.exitCode).toBe(1)
  })

  it('redacts unexpected application errors rather than echoing supplied values', async () => {
    const report = jest.fn()
    await runSecretFileBootstrap(async () => { throw new Error(marker) },
      { APP_ENV: 'staging', [secretBootstrapFileVariable]: write() }, report)
    expect(report).toHaveBeenCalledWith({ code: 'APPLICATION_START_FAILED', reason: 'application-startup' })
    expect(JSON.stringify(report.mock.calls)).not.toContain(marker)
  })
})
