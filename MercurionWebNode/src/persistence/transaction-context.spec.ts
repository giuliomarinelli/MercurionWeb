import type { DataSource, EntityManager } from 'typeorm'

import {
  afterTransactionCommit,
  runInTransaction,
  transactionManager,
  transactionRepository,
  UnitOfWork
} from './transaction-context'

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

  it('reuses an explicitly propagated context without opening a nested transaction', async () => {
    const manager = { getRepository: jest.fn(() => ({ manager: 'bound' })) } as unknown as EntityManager
    const transaction = jest.fn(async (work) => work(manager))
    const dataSource = {
      transaction
    } as unknown as DataSource
    const unitOfWork = new UnitOfWork(dataSource)

    await unitOfWork.run(async (context) => {
      await expect(unitOfWork.run(async (nestedContext) => {
        expect(nestedContext).toBe(context)
        expect(transactionRepository(nestedContext, class Example {})).toEqual({ manager: 'bound' })
        return 'nested'
      }, context)).resolves.toBe('nested')
    })

    expect(transaction).toHaveBeenCalledTimes(1)
  })

  it('runs deferred effects after commit and omits them after rollback', async () => {
    const order: string[] = []
    const dataSource = {
      transaction: jest.fn(async (work) => {
        try {
          const value = await work({} as EntityManager)
          order.push('commit')
          return value
        } catch (error) {
          order.push('rollback')
          throw error
        }
      })
    } as unknown as DataSource

    await runInTransaction(dataSource, async (context) => {
      order.push('work')
      afterTransactionCommit(context, async () => { order.push('effect') })
    })
    expect(order).toEqual(['work', 'commit', 'effect'])

    order.length = 0
    await expect(runInTransaction(dataSource, async (context) => {
      afterTransactionCommit(context, async () => { order.push('effect') })
      throw new Error('failure')
    })).rejects.toThrow('failure')
    expect(order).toEqual(['rollback'])
  })
})
