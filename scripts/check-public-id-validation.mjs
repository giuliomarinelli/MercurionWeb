import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = join(process.cwd(), 'MercurionWebNode', 'src')
const governed = /(?:resolver|controller|dto|input|pipe|scalar)\.ts$/i
const forbidden = [
  /private\s+ensureUuidv?7?\s*\(/,
  /GeneralUtils\.ensureValidUUIDv7/,
  /@IsUUID\s*\(/,
  /\/\^\[0-9a-f\]/i,
]

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesUnder(path))
    else if (governed.test(entry.name)) files.push(path)
  }
  return files
}

const violations = []
for (const file of await filesUnder(root)) {
  const source = await readFile(file, 'utf8')
  for (const pattern of forbidden) {
    if (pattern.test(source)) {
      violations.push(`${relative(process.cwd(), file)} matches ${pattern}`)
    }
  }
}

if (violations.length > 0) {
  console.error(violations.join('\n'))
  process.exitCode = 1
} else {
  console.log('Public-ID validation policy passed')
}
