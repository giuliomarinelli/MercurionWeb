import { Injectable } from '@nestjs/common'
import { DataSource, EntityManager } from 'typeorm'

declare const transactionContextBrand: unique symbol

export interface TransactionContext {
  readonly [transactionContextBrand]: true
}

const managers = new WeakMap<TransactionContext, EntityManager>()

function createTransactionContext(manager: EntityManager): TransactionContext {
  const context = Object.freeze({}) as TransactionContext
  managers.set(context, manager)
  return context
}

export function transactionManager(context: TransactionContext): EntityManager {
  const manager = managers.get(context)
  if (!manager) throw new Error('TransactionContext is not active')
  return manager
}

@Injectable()
export class UnitOfWork {
  constructor(private readonly dataSource: DataSource) {}

  run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    return this.dataSource.transaction(async (manager) => {
      const context = createTransactionContext(manager)
      try {
        return await work(context)
      } finally {
        managers.delete(context)
      }
    })
  }
}
