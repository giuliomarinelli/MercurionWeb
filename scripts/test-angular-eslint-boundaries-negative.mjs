import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const fixtureDirectory = resolve(
  root,
  'MercurionWebNg/src/eslint-boundary-fixture'
)
const fixture = resolve(fixtureDirectory, 'forbidden.ts')

mkdirSync(fixtureDirectory, { recursive: true })
writeFileSync(
  fixture,
  [
    "import { environment } from '../environments/environment.development'",
    'export const leakedStorage = localStorage.getItem("forbidden")',
    'export const leakedEnvironment = environment'
  ].join('\n')
)

try {
  let output = ''
  try {
    const eslintPath = resolve(
      root,
      'node_modules/.bin',
      process.platform === 'win32' ? 'eslint.cmd' : 'eslint'
    )
    const command = process.platform === 'win32' ? process.env.ComSpec : eslintPath
    const args =
      process.platform === 'win32'
        ? ['/d', '/s', '/c', eslintPath, 'src/eslint-boundary-fixture/forbidden.ts', '--max-warnings=0']
        : ['src/eslint-boundary-fixture/forbidden.ts', '--max-warnings=0']
    execFileSync(
      command,
      args,
      { cwd: resolve(root, 'MercurionWebNg'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    )
  } catch (error) {
    output = `${error.stdout ?? ''}${error.stderr ?? ''}${error.message ?? ''}`
  }

  if (
    !output.includes('mercurion-boundaries/angular-boundaries') ||
    !output.includes('canonical environment') ||
    !output.includes('canonical browser storage')
  ) {
    throw new Error(`Boundary fixture did not fail for both forbidden imports:\n${output}`)
  }
} finally {
  if (existsSync(fixtureDirectory)) rmSync(fixtureDirectory, { recursive: true, force: true })
}

console.log('Angular ESLint boundary negative fixture rejected storage and environment violations.')
