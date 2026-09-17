import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const script = fs.readFileSync(path.resolve('scripts/check-command-patch-allowlists.mjs'), 'utf8')
assert.match(script, /Partial<\\s\*\[A-Za-z0-9_\]\*\(\?:Entity\|User\|LabNotebook\|MoleculeCollection\)/)
assert.match(script, /directInputSpread/)
console.log('Explicit command patch allowlist negative checks passed.')
