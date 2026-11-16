import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('MercurionWebNode/src/app_modules')
const violations = []
const partialEntity = /\bPartial<\s*[A-Za-z0-9_]*(?:Entity|User|LabNotebook|MoleculeCollection)\s*>/
const persistenceCall = /\b(?:manager|this\.[A-Za-z]+Repo|repo)\.(?:create|update|save|insert|preload)\s*\(/
const directInputSpread = /\.\.\.(?:input|dto|payload|command|data|userProps)\b/

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(file)
    else if (file.endsWith('.ts') && !file.endsWith('.spec.ts')) inspect(file)
  }
}

function inspect(file) {
  const source = fs.readFileSync(file, 'utf8')
  const relative = path.relative(process.cwd(), file)
  for (const [index, line] of source.split(/\r?\n/).entries()) {
    if (partialEntity.test(line)) {
      violations.push(`${relative}:${index + 1}: partial production entity command`)
    }
    if (persistenceCall.test(line) && directInputSpread.test(line)) {
      violations.push(`${relative}:${index + 1}: direct input spread into persistence call`)
    }
  }
}

walk(root)
if (violations.length > 0) {
  console.error('Explicit command patch allowlist check failed:')
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log('Explicit command patch allowlist check passed.')
}
