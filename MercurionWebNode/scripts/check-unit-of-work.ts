import type { DataSource } from 'typeorm'

import {
  afterTransactionCommit,
  transactionManager,
  UnitOfWork
} from '../src/persistence/transaction-context'

const table = '"__mercurion_unit_of_work_probe"'

export async function checkUnitOfWork(dataSource: DataSource): Promise<void> {
  const unitOfWork = new UnitOfWork(dataSource)
  await dataSource.query(`DROP TABLE IF EXISTS ${table}`)
  await dataSource.query(`CREATE TABLE ${table} (value text NOT NULL)`)

  try {
    let committedEffect = false
    await unitOfWork.run(async (context) => {
      const manager = transactionManager(context)
      await manager.query(`INSERT INTO ${table} (value) VALUES ($1)`, ['root'])
      await unitOfWork.run(async (nestedContext) => {
        if (transactionManager(nestedContext) !== manager) {
          throw new Error('Nested UnitOfWork did not reuse the active EntityManager')
        }
        await transactionManager(nestedContext).query(
          `INSERT INTO ${table} (value) VALUES ($1)`,
          ['nested']
        )
      }, context)
      afterTransactionCommit(context, async () => { committedEffect = true })
    })

    if (!committedEffect) throw new Error('after-commit effect was not awaited')

    let rolledBackEffect = false
    await unitOfWork.run(async (context) => {
      await transactionManager(context).query(
        `INSERT INTO ${table} (value) VALUES ($1)`,
        ['rollback']
      )
      afterTransactionCommit(context, async () => { rolledBackEffect = true })
      throw new Error('expected rollback')
    }).then(
      () => { throw new Error('UnitOfWork swallowed a transactional failure') },
      (error: unknown) => {
        if (!(error instanceof Error) || error.message !== 'expected rollback') throw error
      }
    )

    if (rolledBackEffect) throw new Error('after-commit effect ran after rollback')
    const rows = await dataSource.query(`SELECT value FROM ${table} ORDER BY value`) as Array<{ value: string }>
    const values = rows.map(({ value }) => value)
    if (values.join(',') !== 'nested,root') {
      throw new Error(`Unexpected UnitOfWork rows: ${values.join(',')}`)
    }
  } finally {
    await dataSource.query(`DROP TABLE IF EXISTS ${table}`)
  }

  console.log('UnitOfWork PostgreSQL integration checks passed.')
}
