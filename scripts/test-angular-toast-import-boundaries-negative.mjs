import assert from 'node:assert/strict'
import {
  collectRelativeImportSpecifiers,
  findDependencyPath
} from './check-angular-toast-import-boundaries.mjs'

assert.deepEqual(
  collectRelativeImportSpecifiers(
    'toast.service.ts',
    "import { ToastComponent } from '../components/common/toast/toast.component';"
  ),
  ['../components/common/toast/toast.component']
)

const graphWithIndirectCycle = new Map([
  ['toast.service.ts', ['toast-helper.ts']],
  ['toast-helper.ts', ['toast.component.ts']],
  ['toast.component.ts', ['toast.service.ts']]
])

assert.deepEqual(
  findDependencyPath(graphWithIndirectCycle, 'toast.service.ts', 'toast.component.ts'),
  ['toast.service.ts', 'toast-helper.ts', 'toast.component.ts']
)
assert.equal(
  findDependencyPath(new Map([['toast.service.ts', ['toast.models.ts']]]), 'toast.service.ts', 'toast.component.ts'),
  undefined
)

console.log('Angular toast import boundary negative check passed.')
