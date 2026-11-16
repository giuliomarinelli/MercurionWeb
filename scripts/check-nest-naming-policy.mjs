import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const governedRoots = [
  path.join(repositoryRoot, 'MercurionWebNode', 'src'),
  path.join(repositoryRoot, 'packages', 'rest-contracts', 'src'),
]
const forbiddenNames = [
  'SercurityService',
  'sercurity',
  'recover-cretentials',
  'Unauthanticated',
  'AUTHENTICATION_UNAUTHENTICATED_LEGACY_TYPO',
]
const forbiddenPathSegments = new Set(['Models', 'DTO', 'socket.IO', 'socket.io'])

function walk(directory) {
  if (!fs.existsSync(directory)) return []
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(file) : [file]
  })
}

function relative(file) {
  return path.relative(repositoryRoot, file).split(path.sep).join('/')
}

function check() {
  const violations = []
  for (const root of governedRoots) {
    for (const file of walk(root)) {
      const rel = relative(file)
      const segments = rel.split('/')
      for (const segment of segments) {
        if (forbiddenPathSegments.has(segment)) {
          violations.push(`${rel}: forbidden path segment "${segment}"`)
        }
      }
      if (!/\.(ts|tsx|json|md)$/.test(file)) continue
      const source = fs.readFileSync(file, 'utf8')
      for (const name of forbiddenNames) {
        if (source.includes(name)) {
          violations.push(`${rel}: forbidden legacy name "${name}"`)
        }
      }
    }
  }
  if (violations.length) {
    throw new Error(`Nest naming policy violations:\n${violations.join('\n')}`)
  }
}

check()
console.log('Nest naming policy passed.')
