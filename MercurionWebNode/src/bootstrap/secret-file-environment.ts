import {
  closeSync, constants, fstatSync, lstatSync, openSync, readSync
} from 'node:fs'
import { isAbsolute } from 'node:path'
import { TextDecoder } from 'node:util'
import { environmentSchema } from '../config/config.schema'

export const secretBootstrapFileVariable = 'MERCURION_BOOTSTRAP_FILE'
export const maximumBootstrapBytes = 1024 * 1024

export type SecretBootstrapReason =
  | 'missing-file' | 'file-unreadable' | 'file-type' | 'file-permissions'
  | 'file-size' | 'invalid-document' | 'environment-mismatch'
  | 'unknown-variable' | 'invalid-value' | 'environment-conflict'

export class SecretBootstrapError extends Error {
  readonly code = 'INVALID_SECRET_BOOTSTRAP'

  constructor(readonly reason: SecretBootstrapReason) {
    super(`Secret bootstrap rejected: ${reason}`)
    this.name = 'SecretBootstrapError'
  }
}

const rsaNames = ['JWT_RS256_PRIVATE_KEY', 'JWT_RS256_PUBLIC_KEY',
  'JWT_WS_RS256_PRIVATE_KEY', 'JWT_WS_RS256_PUBLIC_KEY']
const protectedVariables = new Set(['APP_ENV', 'NODE_ENV', 'JWT_LOCAL_KEYS_CONFIG'])
const allowedVariables = new Set<string>([
  ...environmentSchema.sources.filter(name => !protectedVariables.has(name)),
  ...rsaNames, ...rsaNames.map(name => `${name}_B64`)
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/** Parse every entry before touching the target. Values are never evaluated as shell/dotenv. */
export function parseSecretEnvironment(
  bytes: Uint8Array,
  target: Readonly<NodeJS.ProcessEnv>
): Record<string, string> {
  if (bytes.byteLength === 0 || bytes.byteLength > maximumBootstrapBytes) {
    throw new SecretBootstrapError('file-size')
  }
  let document: unknown
  try {
    document = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown
  } catch {
    throw new SecretBootstrapError('invalid-document')
  }
  if (!isRecord(document) || Object.keys(document).sort().join(',') !== 'environment,schemaVersion,variables'
    || document.schemaVersion !== 1 || !isRecord(document.variables)) {
    throw new SecretBootstrapError('invalid-document')
  }
  if (!['staging', 'production'].includes(String(document.environment))
    || document.environment !== target.APP_ENV) {
    throw new SecretBootstrapError('environment-mismatch')
  }
  const entries = Object.entries(document.variables)
  if (entries.length === 0) throw new SecretBootstrapError('invalid-document')
  const prepared: Record<string, string> = Object.create(null) as Record<string, string>
  for (const [name, value] of entries) {
    if (!allowedVariables.has(name)) throw new SecretBootstrapError('unknown-variable')
    if (typeof value !== 'string' || value.trim().length === 0 || value.includes('\0')
      || Buffer.from(value, 'utf8').toString('utf8') !== value) {
      throw new SecretBootstrapError('invalid-value')
    }
    // Refuse even identical duplicates: delivery must have one explicit source.
    if (target[name] !== undefined) throw new SecretBootstrapError('environment-conflict')
    prepared[name] = value
  }
  return prepared
}

function readSecretDocument(path: string): Uint8Array {
  let descriptor: number | undefined
  try {
    if (!lstatSync(path).isFile()) throw new SecretBootstrapError('file-type')
    descriptor = openSync(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0))
    const metadata = fstatSync(descriptor)
    if (!metadata.isFile()) throw new SecretBootstrapError('file-type')
    // Source file ownership is assigned by the operator; group-read is allowed, group-write/execute and other access are not.
    if (process.platform !== 'win32' && (metadata.mode & 0o037) !== 0) {
      throw new SecretBootstrapError('file-permissions')
    }
    if (metadata.size === 0 || metadata.size > maximumBootstrapBytes) throw new SecretBootstrapError('file-size')
    const buffer = Buffer.alloc(maximumBootstrapBytes + 1)
    let size = 0
    while (size < buffer.length) {
      const count = readSync(descriptor, buffer, size, buffer.length - size, null)
      if (count === 0) break
      size += count
    }
    if (size > maximumBootstrapBytes) throw new SecretBootstrapError('file-size')
    return buffer.subarray(0, size)
  } catch (error) {
    if (error instanceof SecretBootstrapError) throw error
    throw new SecretBootstrapError('file-unreadable')
  } finally {
    if (descriptor !== undefined) closeSync(descriptor)
  }
}

/** Opt-in process environment injection only. No writes, secret generation or cleanup of source files. */
export function loadSecretFileEnvironment(target: NodeJS.ProcessEnv = process.env): void {
  const path = target[secretBootstrapFileVariable]
  if (!path || !isAbsolute(path)) throw new SecretBootstrapError('missing-file')
  const prepared = parseSecretEnvironment(readSecretDocument(path), target)
  Object.assign(target, prepared)
}
