import { randomUUID } from 'node:crypto'
import type { DataSource } from 'typeorm'
import { EnforceIntegrityConstraints1789486400000 } from '../src/persistence/migrations/1789486400000-EnforceIntegrityConstraints'

interface PgError {
  readonly code?: string
  readonly constraint?: string
}

const requiredSchemaObjects = [
  'uq_auth_identities_provider_subject',
  'idx_auth_identities_user_provider',
  'uq_molecule_collections_id_user',
  'idx_molecule_collections_user_name',
  'idx_molecule_collections_user_touched',
  'uq_molecule_collection_items_id_user',
  'idx_molecule_collection_items_user_touched',
  'uq_molecule_collection_join_owner',
  'idx_molecule_collection_join_owner_item',
  'fk_molecule_join_owned_collection',
  'fk_molecule_join_owned_item',
  'ck_synth_step_order_non_negative',
  'ck_synth_step_item_order_non_negative',
  'ck_synth_step_item_position',
  'ck_synth_step_item_kind'
] as const

function assertConstraintFailure(
  result: PromiseSettledResult<unknown>,
  code: string,
  constraint: string
): void {
  if (result.status !== 'rejected') {
    throw new Error(`Expected PostgreSQL constraint ${constraint} to reject the write`)
  }
  const error = result.reason as PgError
  if (error.code !== code || error.constraint !== constraint) {
    throw new Error(
      `Expected PostgreSQL ${code}/${constraint}, received ${error.code ?? 'unknown'}/${error.constraint ?? 'unknown'}`
    )
  }
}

export async function checkDatabaseIntegrity(dataSource: DataSource): Promise<void> {
  const objects = await dataSource.query<Array<{ name: string }>>(`
    SELECT conname AS name FROM pg_constraint WHERE conname = ANY($1::text[])
    UNION
    SELECT indexname AS name FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[])
  `, [requiredSchemaObjects])
  const found = new Set(objects.map(object => object.name))
  const missing = requiredSchemaObjects.filter(name => !found.has(name))
  if (missing.length > 0) {
    throw new Error(`Required database integrity objects are missing: ${missing.join(', ')}`)
  }

  const ownerA = randomUUID()
  const ownerB = randomUUID()
  const collectionA = randomUUID()
  const collectionB = randomUUID()
  const collectionRace = randomUUID()
  const itemA = randomUUID()
  const itemB = randomUUID()
  const now = Date.now()

  await dataSource.query(`
    INSERT INTO molecule_collections (id, name, user_id, created_at, updated_at, touched_at)
    VALUES ($1, 'integrity-a', $2, $6, $6, $6),
           ($3, 'integrity-b', $4, $6, $6, $6),
           ($5, 'integrity-race', $2, $6, $6, $6)
  `, [collectionA, ownerA, collectionB, ownerB, collectionRace, now])
  await dataSource.query(`
    INSERT INTO molecule_collection_items (id, user_id, type, created_at, updated_at, touched_at)
    VALUES ($1, $2, 'custom', $5, $5, $5), ($3, $4, 'custom', $5, $5, $5)
  `, [itemA, ownerA, itemB, ownerB, now])

  try {
    await dataSource.query(`
      INSERT INTO molecule_collection_items_join (id, user_id, collection_id, item_id)
      VALUES ($1, $2, $3, $4)
    `, [randomUUID(), ownerA, collectionA, itemA])

    const duplicate = await Promise.allSettled([
      dataSource.query(`
        INSERT INTO molecule_collection_items_join (id, user_id, collection_id, item_id)
        VALUES ($1, $2, $3, $4)
      `, [randomUUID(), ownerA, collectionA, itemA])
    ])
    assertConstraintFailure(duplicate[0], '23505', 'uq_molecule_collection_join_owner')

    const wrongCollectionOwner = await Promise.allSettled([
      dataSource.query(`
        INSERT INTO molecule_collection_items_join (id, user_id, collection_id, item_id)
        VALUES ($1, $2, $3, $4)
      `, [randomUUID(), ownerB, collectionA, itemB])
    ])
    assertConstraintFailure(wrongCollectionOwner[0], '23503', 'fk_molecule_join_owned_collection')

    const race = await Promise.allSettled([
      dataSource.query(`INSERT INTO molecule_collection_items_join (id, user_id, collection_id, item_id) VALUES ($1, $2, $3, $4)`, [randomUUID(), ownerA, collectionRace, itemA]),
      dataSource.query(`INSERT INTO molecule_collection_items_join (id, user_id, collection_id, item_id) VALUES ($1, $2, $3, $4)`, [randomUUID(), ownerA, collectionRace, itemA])
    ])
    if (race.filter(result => result.status === 'fulfilled').length !== 1) {
      throw new Error('Concurrent join inserts did not converge to exactly one persisted row')
    }
    assertConstraintFailure(race.find(result => result.status === 'rejected')!, '23505', 'uq_molecule_collection_join_owner')

    const rollbackId = randomUUID()
    const runner = dataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction()
    try {
      await runner.query(`INSERT INTO molecule_collection_items_join (id, user_id, collection_id, item_id) VALUES ($1, $2, $3, $4)`, [rollbackId, ownerA, collectionB, itemA])
      throw new Error('Expected the cross-owner insert to fail')
    } catch (error) {
      const pgError = error as PgError
      if (pgError.code !== '23503') throw error
      await runner.rollbackTransaction()
    } finally {
      await runner.release()
    }
    const [{ count }] = await dataSource.query<Array<{ count: number }>>(
      'SELECT count(*)::int AS count FROM molecule_collection_items_join WHERE id = $1',
      [rollbackId]
    )
    if (count !== 0) throw new Error('Failed integrity write left a partial join row after rollback')
  } finally {
    await dataSource.query('DELETE FROM molecule_collection_items_join WHERE user_id = ANY($1::uuid[])', [[ownerA, ownerB]])
    await dataSource.query('DELETE FROM molecule_collection_items WHERE id = ANY($1::uuid[])', [[itemA, itemB]])
    await dataSource.query('DELETE FROM molecule_collections WHERE id = ANY($1::uuid[])', [[collectionA, collectionB, collectionRace]])
  }

  console.log('Database integrity metadata, ownership, concurrency and rollback checks passed.')
}

export async function checkIntegrityMigrationBackfill(dataSource: DataSource): Promise<void> {
  const runner = dataSource.createQueryRunner()
  const migration = new EnforceIntegrityConstraints1789486400000()
  const ownerA = randomUUID()
  const ownerB = randomUUID()
  const staleJoin = randomUUID()
  const crossOwnerJoin = randomUUID()
  const collectionA = randomUUID()
  const itemA = randomUUID()
  const itemB = randomUUID()
  const now = Date.now()

  await runner.connect()
  await runner.startTransaction()
  try {
    await migration.down(runner)
    await runner.query(`INSERT INTO molecule_collections (id, name, user_id, created_at, updated_at, touched_at) VALUES ($1, 'backfill', $2, $3, $3, $3)`, [collectionA, ownerA, now])
    await runner.query(`INSERT INTO molecule_collection_items (id, user_id, type, created_at, updated_at, touched_at) VALUES ($1, $2, 'custom', $4, $4, $4), ($3, $5, 'custom', $4, $4, $4)`, [itemA, ownerA, itemB, now, ownerB])
    await runner.query(`INSERT INTO molecule_collection_items_join (id, user_id, collection_id, item_id) VALUES ($1, $2, $3, $4), ($5, $6, $3, $7)`, [staleJoin, ownerB, collectionA, itemA, crossOwnerJoin, ownerA, itemB])

    await migration.up(runner)

    const [repaired] = await runner.query('SELECT user_id FROM molecule_collection_items_join WHERE id = $1', [staleJoin]) as Array<{ user_id: string }>
    if (repaired?.user_id !== ownerA) {
      throw new Error('Integrity migration did not repair a stale denormalized join owner')
    }
    const [{ count }] = await runner.query('SELECT count(*)::int AS count FROM molecule_collection_items_join WHERE id = $1', [crossOwnerJoin]) as Array<{ count: number }>
    if (count !== 0) {
      throw new Error('Integrity migration retained an intrinsically cross-owner association')
    }
  } finally {
    await runner.rollbackTransaction()
    await runner.release()
  }

  console.log('Database integrity migration backfill checks passed.')
}
