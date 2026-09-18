import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const packageManifestPath = resolve(root, 'package.json')
const defaultIdentityPath = resolve(root, 'build', 'build-identity.json')
const angularIdentityPath = resolve(root, 'MercurionWebNg', 'src', 'generated', 'build-identity.ts')
const nestIdentityPath = resolve(root, 'MercurionWebNode', 'src', 'generated', 'build-identity.ts')

function argument(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function sourceRevision() {
  const configured = process.env.BUILD_REVISION ?? process.env.GITHUB_SHA
  if (configured) return configured
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
}

function assertRevision(revision) {
  if (!/^[0-9a-f]{40}$/i.test(revision)) {
    throw new Error(`Build revision must be a full 40-character hexadecimal commit SHA: ${revision}`)
  }
  return revision.toLowerCase()
}

export async function createBuildIdentity({ version, revision } = {}) {
  const release = JSON.parse(await readFile(packageManifestPath, 'utf8'))
  const releaseVersion = version ?? release.version
  if (!/^\d+\.\d+\.\d+$/.test(releaseVersion)) {
    throw new Error(`Canonical release version must use MAJOR.MINOR.PATCH format: ${releaseVersion}`)
  }
  return Object.freeze({
    version: releaseVersion,
    revision: assertRevision(revision ?? sourceRevision())
  })
}

export function assertBuildIdentitiesMatch(...identities) {
  if (identities.length === 0) throw new Error('At least one build identity is required')
  const [expected] = identities
  for (const identity of identities) {
    if (identity.version !== expected.version || identity.revision !== expected.revision) {
      throw new Error(
        `Build identity mismatch: expected ${expected.version}@${expected.revision}, ` +
        `received ${identity.version}@${identity.revision}`
      )
    }
  }
  return expected
}

function identityModule(identity) {
  return [
    `export const buildIdentity = Object.freeze({`,
    `  version: '${identity.version}',`,
    `  revision: '${identity.revision}'`,
    `} as const)`,
    ''
  ].join('\n')
}

export async function writeBuildIdentity(identity, output = defaultIdentityPath) {
  await mkdir(dirname(output), { recursive: true })
  await writeFile(output, `${JSON.stringify(identity, null, 2)}\n`, 'utf8')
  await mkdir(dirname(angularIdentityPath), { recursive: true })
  await writeFile(angularIdentityPath, identityModule(identity), 'utf8')
  await mkdir(dirname(nestIdentityPath), { recursive: true })
  await writeFile(nestIdentityPath, identityModule(identity), 'utf8')
  return identity
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = resolve(root, argument('--output') ?? 'build/build-identity.json')
  const identity = await createBuildIdentity({
    version: argument('--version'),
    revision: argument('--revision')
  })
  await writeBuildIdentity(identity, output)
  console.log(`Generated build identity ${identity.version}@${identity.revision}`)
}
