import 'reflect-metadata'
import { ConfigService } from '@nestjs/config'
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { ScopeService } from './app_modules/auth/services/scope.service'
import { SecurityService } from './app_modules/auth/services/security.service'
import { PasswordEncoderService } from './app_modules/auth/services/password-encoder.service'
import { LoggerContext, LoggerPort } from './logging/logger.port'

// Offline adapters: this CLI never creates a Nest application or database connection.
class OfflineLogger extends LoggerPort {
  forContext(): LoggerContext {
    const silent = () => undefined
    return { log: silent, error: silent, warn: silent, debug: silent,
      verbose: silent, fatal: silent, setLogLevels: silent }
  }
}

export function adminScopeService(key: string): ScopeService {
  if (!/^[A-Za-z0-9+/]{43}=$/.test(key) || Buffer.from(key, 'base64').length !== 32) {
    throw new Error('APP_AES_SECRET must be base64 for exactly 32 bytes')
  }
  const config = new ConfigService({ App: { AES_secret: key }, Totp: {} })
  const logger = new OfflineLogger()
  const security = new SecurityService(config, new PasswordEncoderService(config, logger))
  return new ScopeService(security, {
    getUserScopesById: () => { throw new Error('Database access forbidden in offline tool') },
  }, logger)
}

export function exportAdminScopes(configurationPath: string, outputPath: string): number {
  const configuration = realpathSync(configurationPath)
  const output = resolve(realpathSync(dirname(outputPath)), outputPath.split(/[\\/]/).pop()!)
  let repository = resolve(__dirname)
  // Source archives and container test contexts intentionally exclude .git.
  const isWorkspace = (directory: string) => {
    const manifest = join(directory, 'package.json')
    if (!existsSync(manifest)) return false
    const value: unknown = JSON.parse(readFileSync(manifest, 'utf8'))
    return typeof value === 'object' && value !== null &&
      'name' in value && value.name === 'mercurion-web-workspace'
  }
  while (!isWorkspace(repository) && dirname(repository) !== repository) {
    repository = dirname(repository)
  }
  if (!isWorkspace(repository)) throw new Error('Local workspace required')
  const insideRepository = (path: string) => {
    const part = relative(repository, path)
    return part === '' || (!part.startsWith('..' + sep) && part !== '..' && !isAbsolute(part))
  }
  if (insideRepository(configuration) || dirname(output) !== dirname(configuration)) {
    throw new Error('Use private configuration outside the repository; output must be in the same directory')
  }
  const document: unknown = JSON.parse(readFileSync(configuration, 'utf8').replace(/^\uFEFF/, ''))
  const value = document as { environment?: string; applicationSecrets?: { APP_AES_SECRET?: unknown } }
  if (value?.environment !== 'preview' || typeof value.applicationSecrets?.APP_AES_SECRET !== 'string') {
    throw new Error('Preview configuration with APP_AES_SECRET required')
  }
  const service = adminScopeService(value.applicationSecrets.APP_AES_SECRET)
  const scopes = service.getEncryptedAdminScopes()
  if (scopes.length === 0 || service.decryptScopes(...scopes).length !== scopes.length) {
    throw new Error('Scope roundtrip failed')
  }
  writeFileSync(output, JSON.stringify(scopes, null, 2) + '\n', { flag: 'wx', mode: 0o600 })
  return scopes.length
}

if (require.main === module) {
  try {
    const args = process.argv.slice(2)
    if (args.length !== 4 || args[0] !== '--configuration' || args[2] !== '--out') {
      throw new Error('usage')
    }
    const count = exportAdminScopes(args[1], args[3])
    console.log(JSON.stringify({ status: 'admin-scopes-exported', scopeCount: count,
      databaseModified: false, keyPrinted: false }))
  } catch {
    // Do not print parser errors, private file contents, or key material.
    console.error('Admin scope export failed. Check arguments, private paths, AES key and that output does not already exist.')
    process.exitCode = 1
  }
}
