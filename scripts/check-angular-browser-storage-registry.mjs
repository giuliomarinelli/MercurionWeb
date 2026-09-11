import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve('MercurionWebNg/src/app')
const violations = []

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(file)
    else if (/\.(ts|html)$/.test(entry.name) && !/\.(spec|test)\.ts$/.test(entry.name)) {
      const source = fs.readFileSync(file, 'utf8')
      if (file.endsWith('browser-storage-registry.ts')) continue
      for (const [index, line] of source.split(/\r?\n/).entries()) {
        if (/\b(?:localStorage|sessionStorage)\s*\./.test(line)) {
          violations.push(`${path.relative(process.cwd(), file)}:${index + 1}`)
        }
      }
    }
  }
}

walk(root)
if (violations.length) {
  console.error(`Unregistered Angular browser storage access:\n${violations.join('\n')}`)
  process.exit(1)
}
console.log('Angular browser storage registry policy passed.')
