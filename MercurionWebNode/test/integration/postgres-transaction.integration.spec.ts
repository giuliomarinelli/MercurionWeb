import { randomUUID } from 'node:crypto'
import { DataSource, QueryFailedError } from 'typeorm'
import {
  runInTransaction,
  transactionManager
} from '../../src/persistence/transaction-context'
import {
  createPostgresIntegrationFixture,
  type PostgresIntegrationFixture
} from './postgres-test-fixture'

interface PostgresConstraintError {
  readonly code?: string
  readonly constraint?: string
}

function postgresError(error: unknown): PostgresConstraintError {
  if (!(error instanceof QueryFailedError)) {
    throw error
  }
  return error.driverError as PostgresConstraintError
}

async function countById(
  dataSource: DataSource,
  table: string,
  id: string
): Promise<number> {
  const rows = await dataSource.query<Array<{ count: number }>>(
    `SELECT count(*)::int AS count FROM "${table}" WHERE id = $1`,
    [id]
  )
  return rows[0]?.count ?? 0
}

async function insertCollection(
  dataSource: DataSource,
  id: string,
  userId: string
): Promise<void> {
  await dataSource.query(
    `INSERT INTO molecule_collections
      (id, name, user_id, created_at, updated_at, touched_at)
     VALUES ($1, $2, $3, $4, $4, $4)`,
    [id, `integration-${id}`, userId, Date.now()]
  )
}

async function insertItem(
  dataSource: DataSource,
  id: string,
  userId: string
): Promise<void> {
  await dataSource.query(
    `INSERT INTO molecule_collection_items
      (id, user_id, type, created_at, updated_at, touched_at)
     VALUES ($1, $2, 'custom', $3, $3, $3)`,
    [id, userId, Date.now()]
  )
}

describe('real PostgreSQL transaction invariants', () => {
  let fixture: PostgresIntegrationFixture
  let dataSource: DataSource

  beforeAll(async () => {
    fixture = await createPostgresIntegrationFixture()
    dataSource = fixture.dataSource
  })

  afterEach(async () => {
    if (!dataSource?.isInitialized) return
    await dataSource.query(
      `TRUNCATE TABLE
        molecule_collection_items_join,
        molecule_collection_items,
        molecule_collections,
        synth_steps
       CASCADE`
    )
  })

  afterAll(async () => {
    if (fixture) await fixture.close()
  })

  it('creates an empty schema from migrations before the suite starts', async () => {
    expect(await dataSource.showMigrations()).toBe(false)
    const [{ count }] = await dataSource.query<Array<{ count: number }>>(
      'SELECT count(*)::int AS count FROM typeorm_migrations'
    )
    expect(count).toBe(dataSource.migrations.length)
    expect(dataSource.options.synchronize).toBe(false)
  })

  it('rolls back all writes after a mid-command failure', async () => {
    const userId = randomUUID()
    const collectionId = randomUUID()
    const itemId = randomUUID()

    await expect(runInTransaction(dataSource, async context => {
      const manager = transactionManager(context)
      await manager.query(
        `INSERT INTO molecule_collections
          (id, name, user_id, created_at, updated_at, touched_at)
         VALUES ($1, 'rollback', $2, $3, $3, $3)`,
        [collectionId, userId, Date.now()]
      )
      await manager.query(
        `INSERT INTO molecule_collection_items
          (id, user_id, type, created_at, updated_at, touched_at)
         VALUES ($1, $2, 'custom', $3, $3, $3)`,
        [itemId, userId, Date.now()]
      )
      throw new Error('injected integration failure')
    })).rejects.toThrow('injected integration failure')

    expect(await countById(dataSource, 'molecule_collections', collectionId)).toBe(0)
    expect(await countById(dataSource, 'molecule_collection_items', itemId)).toBe(0)
  })

  it('enforces ownership, uniqueness, and check constraints at the database boundary', async () => {
    const ownerId = randomUUID()
    const otherOwnerId = randomUUID()
    const collectionId = randomUUID()
    const itemId = randomUUID()
    await insertCollection(dataSource, collectionId, ownerId)
    await insertItem(dataSource, itemId, ownerId)

    await expect(dataSource.query(
      `INSERT INTO molecule_collection_items_join
        (id, user_id, collection_id, item_id)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), otherOwnerId, collectionId, itemId]
    )).rejects.toMatchObject({
      driverError: {
        code: '23503',
        constraint: 'fk_molecule_join_owned_collection'
      }
    })

    const join = [randomUUID(), ownerId, collectionId, itemId]
    await dataSource.query(
      `INSERT INTO molecule_collection_items_join
        (id, user_id, collection_id, item_id)
       VALUES ($1, $2, $3, $4)`,
      join
    )
    await expect(dataSource.query(
      `INSERT INTO molecule_collection_items_join
        (id, user_id, collection_id, item_id)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), ...join.slice(1)]
    )).rejects.toMatchObject({
      driverError: {
        code: '23505',
        constraint: 'uq_molecule_collection_join_owner'
      }
    })

    await expect(dataSource.query(
      `INSERT INTO synth_steps
        (id, user_id, synth_id, step_order)
       VALUES ($1, $2, $3, -1)`,
      [randomUUID(), ownerId, randomUUID()]
    )).rejects.toMatchObject({
      driverError: {
        code: '23514',
        constraint: 'ck_synth_step_order_non_negative'
      }
    })
  })

  it('converges concurrent writes to one unique ownership row', async () => {
    const userId = randomUUID()
    const collectionId = randomUUID()
    const itemId = randomUUID()
    await insertCollection(dataSource, collectionId, userId)
    await insertItem(dataSource, itemId, userId)

    const results = await Promise.allSettled([
      dataSource.transaction(async manager => {
        await manager.query(
          `INSERT INTO molecule_collection_items_join
            (id, user_id, collection_id, item_id)
           VALUES ($1, $2, $3, $4)`,
          [randomUUID(), userId, collectionId, itemId]
        )
      }),
      dataSource.transaction(async manager => {
        await manager.query(
          `INSERT INTO molecule_collection_items_join
            (id, user_id, collection_id, item_id)
           VALUES ($1, $2, $3, $4)`,
          [randomUUID(), userId, collectionId, itemId]
        )
      })
    ])

    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find(result => result.status === 'rejected')
    expect(rejected?.status).toBe('rejected')
    if (rejected?.status === 'rejected') {
      expect(postgresError(rejected.reason)).toMatchObject({
        code: '23505',
        constraint: 'uq_molecule_collection_join_owner'
      })
    }
    const [{ count }] = await dataSource.query<Array<{ count: number }>>(
      `SELECT count(*)::int AS count
       FROM molecule_collection_items_join
       WHERE user_id = $1 AND collection_id = $2 AND item_id = $3`,
      [userId, collectionId, itemId]
    )
    expect(count).toBe(1)
  })

  it('does not expose uncommitted writes and uses the transaction manager', async () => {
    const userId = randomUUID()
    const collectionId = randomUUID()
    let committed = false

    await runInTransaction(dataSource, async context => {
      await transactionManager(context).query(
        `INSERT INTO molecule_collections
          (id, name, user_id, created_at, updated_at, touched_at)
         VALUES ($1, 'visibility', $2, $3, $3, $3)`,
        [collectionId, userId, Date.now()]
      )
      expect(await countById(dataSource, 'molecule_collections', collectionId)).toBe(0)
      committed = true
    })

    expect(committed).toBe(true)
    expect(await countById(dataSource, 'molecule_collections', collectionId)).toBe(1)
  })
})
