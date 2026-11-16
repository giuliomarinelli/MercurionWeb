import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const patchPath = 'MercurionWebNg/patches/@rdkit+rdkit+2024.3.5-1.0.0.patch'
const patch = await readFile(patchPath, 'utf8')

assert.equal(
  [...patch.matchAll(/^diff --git /gm)].length,
  1,
  'RDKit patch must remain a single-file delta'
)
assert.match(patch, /^diff --git a\/node_modules\/@rdkit\/rdkit\/dist\/RDKit_minimal\.js b\/node_modules\/@rdkit\/rdkit\/dist\/RDKit_minimal\.js$/m)
assert.match(patch, /^-function\(moduleArg = \{\}\) \{$/m)
assert.match(patch, /^\+    function \(moduleArg = \{\}\) \{$/m)
assert.match(patch, /^-  var moduleRtn;$/m)
assert.match(patch, /^\+      var moduleRtn;$/m)

const renderer = await readFile('MercurionWebNg/src/app/chemistry/adapters/rdkit-renderer.adapter.ts', 'utf8')
assert.match(renderer, /import\('@rdkit\/rdkit'\)/)
assert.match(renderer, /locateFile: \(\) => '\/RDKit_minimal\.wasm'/)

console.log('RDKit patch regression passed: exact wrapper delta and lazy WASM loader contract are present.')
