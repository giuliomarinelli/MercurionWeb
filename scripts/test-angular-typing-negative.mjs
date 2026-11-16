import assert from 'node:assert/strict'
import { collectAngularTypingViolations } from './check-angular-typing.mjs'

const violations = collectAngularTypingViolations([
  {
    file: 'fixture-explicit-any.ts',
    source: 'const payload: any = {};'
  },
  {
    file: 'fixture-untyped-form.ts',
    source: 'let form: FormGroup;'
  }
])

assert.equal(violations.length, 2)
assert.deepEqual(
  violations.map(({ file, kind }) => ({ file, kind })),
  [
    { file: 'fixture-explicit-any.ts', kind: 'explicit-any' },
    { file: 'fixture-untyped-form.ts', kind: 'untyped-form' }
  ]
)

console.log('Angular typing policy negative checks passed.')
