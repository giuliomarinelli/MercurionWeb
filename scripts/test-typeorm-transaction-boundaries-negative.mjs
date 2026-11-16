import assert from 'node:assert/strict'
import { collectTransactionBoundaryViolations } from './check-typeorm-transaction-boundaries.mjs'

const source = `
await dataSource.transaction(async manager => manager.save(entity))
const queryRunner = dataSource.createQueryRunner()
await queryRunner.startTransaction()
await queryRunner.commitTransaction()
await queryRunner.rollbackTransaction()
`

const violations = collectTransactionBoundaryViolations('bad-service.ts', source)
assert.equal(violations.length, 5)
console.log('TypeORM transaction boundary negative check passed.')
