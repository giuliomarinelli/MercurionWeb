import type { DataSource, EntityManager } from 'typeorm'

import { transactionManager, UnitOfWork } from './transaction-context'

describe('UnitOfWork', () => {
  it('shares one opaque context and invalidates it after the transaction', async () => {
    const manager = {} as EntityManager
    const dataSource = {
      transaction: jest.fn(async (work) => work(manager))
    } as unknown as DataSource
    const unitOfWork = new UnitOfWork(dataSource)
    let captured: Parameters<typeof transactionManager>[0] | undefined

    await expect(unitOfWork.run(async (context) => {
      captured = context
      expect(transactionManager(context)).toBe(manager)
      return 'committed'
    })).resolves.toBe('committed')

    expect(() => transactionManager(captured!)).toThrow('TransactionContext is not active')
  })

  it('propagates failures to the TypeORM transaction boundary', async () => {
    const failure = new Error('rollback')
    const dataSource = {
      transaction: jest.fn(async (work) => work({} as EntityManager))
    } as unknown as DataSource
    const unitOfWork = new UnitOfWork(dataSource)

    await expect(unitOfWork.run(async () => { throw failure })).rejects.toBe(failure)
  })
})
