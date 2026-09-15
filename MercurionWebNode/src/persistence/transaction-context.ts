import { Injectable } from '@nestjs/common'
import { DataSource, EntityManager, EntityTarget, ObjectLiteral, Repository } from 'typeorm'

declare const transactionContextBrand: unique symbol

export interface TransactionContext {
  readonly [transactionContextBrand]: true
}

const managers = new WeakMap<TransactionContext, EntityManager>()
const afterCommitEffects = new WeakMap<TransactionContext, Array<() => Promise<void>>>()

function createTransactionContext(manager: EntityManager): TransactionContext {
  const context = Object.freeze({}) as TransactionContext
  managers.set(context, manager)
  afterCommitEffects.set(context, [])
  return context
}

export function transactionManager(context: TransactionContext): EntityManager {
  const manager = managers.get(context)
  if (!manager) throw new Error('TransactionContext is not active')
  return manager
}

export function transactionRepository<Entity extends ObjectLiteral>(
  context: TransactionContext,
  target: EntityTarget<Entity>
): Repository<Entity> {
  return transactionManager(context).getRepository(target)
}

/**
 * Register a non-database effect that may run only after the root transaction
 * commits. The effect is never invoked after rollback. Its failure is exposed
 * to the caller, but cannot roll back the already committed database work.
 */
export function afterTransactionCommit(
  context: TransactionContext,
  effect: () => Promise<void>
): void {
  transactionManager(context)
  afterCommitEffects.get(context)!.push(effect)
}

type TransactionSource = DataSource | EntityManager
type TransactionWork<T> = (
  context: TransactionContext,
  manager: EntityManager
) => Promise<T>

export async function runInTransaction<T>(
  source: TransactionSource,
  work: TransactionWork<T>,
  context?: TransactionContext
): Promise<T> {
  if (context) return work(context, transactionManager(context))

  let effects: Array<() => Promise<void>> = []
  const result = await source.transaction(async (manager) => {
    const rootContext = createTransactionContext(manager)
    try {
      const value = await work(rootContext, manager)
      effects = [...afterCommitEffects.get(rootContext)!]
      return value
    } finally {
      managers.delete(rootContext)
      afterCommitEffects.delete(rootContext)
    }
  })

  for (const effect of effects) await effect()
  return result
}

@Injectable()
export class UnitOfWork {
  constructor(private readonly dataSource: DataSource) {}

  run<T>(work: TransactionWork<T>, context?: TransactionContext): Promise<T> {
    return runInTransaction(this.dataSource, work, context)
  }
}
