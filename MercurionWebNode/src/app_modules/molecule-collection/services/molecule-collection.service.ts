/* eslint-disable no-useless-escape */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { GraphqlUtils } from 'src/utils/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/utils/type-orm-utils/type-orm-utils';
import { MoleculeCollection } from '../Models/entities/molecule-collection.entity';
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate';
import { History } from 'src/app_modules/history/Models/entities/history.entity';
import { HistoryItemEntity } from 'src/app_modules/history/Models/enums/history-item-entity.enum';
import { uuidv7 } from '@kripod/uuidv7';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';

@Injectable()
export class MoleculeCollectionService {

  private readonly REQUIRED_FIELDS = ['id', 'name']

  // Query set-based con lock “a gruppo”
  private readonly CREATE_MANY_COLLECTIONS_QUERY = `WITH payload AS (
  SELECT *
  FROM jsonb_to_recordset($1::jsonb)
       AS t(
         id uuid,
         user_id uuid,        -- <— qui: era text
         name text,
         created_at bigint,
         updated_at bigint,
         touched_at bigint
       )
),
-- normalizza il base_name rimuovendo " (n)" finale, se presente
norm AS (
  SELECT
    id,
    user_id,
    CASE
      WHEN name ~ ' \(\d+\)$' THEN substring(name FROM '^(.*) \(\d+\)$')
      ELSE name
    END AS base_name,
    created_at,
    updated_at,
    COALESCE(touched_at, 0)::bigint AS touched_at
  FROM payload
),
-- lock per ciascuna coppia (user_id, base_name) per evitare race
locks AS (
  SELECT pg_advisory_xact_lock(
           ((hashtextextended(user_id::text, 17))::bigint << 32)  -- <— cast a text per l’hash
           # (hashtextextended(base_name, 42))::bigint
         )
  FROM (SELECT DISTINCT user_id, base_name FROM norm) d
),
-- rank locale dei duplicati nel batch
ranked AS (
  SELECT
    n.*,
    ROW_NUMBER() OVER (PARTITION BY user_id, base_name ORDER BY id) - 1 AS rn
  FROM norm n
),
-- massimo suffisso già presente nel DB per ogni (user_id, base_name)
existing AS (
  SELECT
    e.user_id,
    e.base_name,
    COALESCE(MAX(
      COALESCE( (regexp_match(mc.name, ' \((\d+)\)$'))[1]::int, 0 )
    ), 0) AS max_suffix
  FROM (
    SELECT DISTINCT user_id, base_name FROM norm
  ) e
  LEFT JOIN LATERAL (
    SELECT mc.name
    FROM public.molecule_collections mc
    WHERE mc.user_id = e.user_id
      AND (mc.name = e.base_name OR mc.name LIKE e.base_name || ' (%)')
  ) mc ON true
  GROUP BY e.user_id, e.base_name
),
-- costruzione del nome finale unico
final_rows AS (
  SELECT
    r.id,
    r.user_id,
    (
      CASE
        WHEN (COALESCE(e.max_suffix,0) + r.rn) = 0 THEN
          NULL
        ELSE
          ' (' || (COALESCE(e.max_suffix,0) + r.rn)::text || ')'
      END
    ) AS suffix,
    r.base_name,
    r.created_at,
    r.updated_at,
    r.touched_at
  FROM ranked r
  LEFT JOIN existing e
    ON e.user_id = r.user_id AND e.base_name = r.base_name
),
final_rows2 AS (
  SELECT
    id,
    user_id,
    CASE
      WHEN suffix IS NULL THEN LEFT(base_name, 255)
      ELSE LEFT(base_name, GREATEST(1, 255 - char_length(suffix))) || suffix
    END AS name,
    created_at,
    updated_at,
    touched_at
  FROM final_rows
)
INSERT INTO public.molecule_collections
  (id, user_id, name, created_at, updated_at, touched_at)
SELECT id, user_id, name, created_at, updated_at, touched_at
FROM final_rows2;


`

  private readonly DELETE_COLLECTION_AND_ORPHAN_MOLECULES = `WITH candidates AS (
  SELECT DISTINCT j.item_id
  FROM molecule_collection_items_join j
  WHERE j.collection_id = $1::uuid
    AND j.user_id      = $2::uuid
),
del_coll AS (
  DELETE FROM molecule_collections c
  WHERE c.id      = $1::uuid
    AND c.user_id = $2::uuid
  RETURNING c.id
)
DELETE FROM molecule_collection_items i
WHERE i.user_id = $2::uuid
  AND i.id IN (SELECT item_id FROM candidates)
  AND NOT EXISTS (
    SELECT 1 FROM molecule_collection_items_join j2
    WHERE j2.item_id = i.id
  );
`

  private readonly logger = new Logger(MoleculeCollectionService.name)

  constructor(
    @InjectRepository(MoleculeCollection)
    private readonly collectionRepo: Repository<MoleculeCollection>,
    private readonly dataSource: DataSource
  ) { }

  async markAsTouched(userId: UUID, collectionId: UUID): Promise<boolean> {
    try {
      return await this.dataSource.manager.transaction(async (manager) => {
        return this.markAsTouchedWithManager(userId, collectionId, manager)
      })
    } catch (e) {
      this.logger.warn(`MoleculeCollectionService > markAsTouched: UPDATE FAILED => ${e}`)
      return false
    }
  }

  async markAsTouchedWithManager(userId: UUID, collectionId: UUID, manager: EntityManager, updateOnlyHistory = false): Promise<boolean> {
    if (!await manager.exists(MoleculeCollection, { where: { userId, id: collectionId } })) {
      return false
    }
    const touchedAt = Date.now()
    if (!updateOnlyHistory) {
      await manager.update(MoleculeCollection, { userId, id: collectionId }, { touchedAt })
    }
    await manager.insert(History, {
      id: uuidv7() as UUID,
      itemEntity: HistoryItemEntity.MoleculeCollection,
      userId,
      touchedAt,
      itemId: collectionId
    })
    return true
  }

  async create(userId: UUID, name: string): Promise<MoleculeCollection> {
    try {
      return this.dataSource.manager.transaction(async (manager) => {
        const now = Date.now()
        const collection = manager.create(MoleculeCollection, {
          id: uuidv7() as UUID,
          name,
          userId,
          createdAt: now,
          updatedAt: now,
          touchedAt: now
        })
        const persisted = await manager.save(MoleculeCollection, collection)
        await this.markAsTouchedWithManager(userId, persisted.id, manager)
        return persisted
      })
    } catch (e) {
      this.logger.warn(e.message)
      throw e
    }
  }

  async createMany(userId: UUID, names: string[]): Promise<boolean> {
    try {

      if (!names.length) {
        return true
      }

      await this.dataSource.manager.transaction(async (manager) => {

        const payload = names.map((name) => {
          const now = Date.now()
          return {
            id: uuidv7() as UUID,
            user_id: String(userId),
            name: GeneralUtils.normalizeSpaces(String(name)),
            created_at: now,
            updated_at: now,
            touched_at: now,
          }
        })
        const sql = this.CREATE_MANY_COLLECTIONS_QUERY
        await manager.query(sql, [JSON.stringify(payload)])

      })
      return true
    } catch (e) {
      this.logger.warn(`Database error: ${e?.message || e}`/*, e*/)
      return false
    }
  }


  async findOne(id: UUID, userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollection | null> {
    const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
    const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)

    let qb = this.collectionRepo.createQueryBuilder('collection')
      .select(columns.map(col => `collection.${col}`))
      .where('collection.id = :id', { id })
      .andWhere('collection.user_id = :userId', { userId })

    qb = TypeOrmUtils.addJoins(qb, 'collection', fieldsMap)

    return qb.getOne()
  }

  async findAllByUser(userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollection[]> {
    const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
    const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)

    let qb = this.collectionRepo.createQueryBuilder('collection')
      .select(columns.map(col => `collection.${col}`))
      .where('collection.user_id = :userId', { userId })
      .orderBy('collection.name', 'ASC')

    qb = TypeOrmUtils.addJoins(qb, 'collection', fieldsMap)

    return qb.getMany()
  }

  async update(id: UUID, userId: UUID, input: Partial<MoleculeCollection>, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollection | null> {
    await this.collectionRepo.update({ id }, { ...input, updatedAt: Date.now() })
    await this.markAsTouched(userId, id)
    return this.findOne(id, userId, fieldsMap)
  }

  async delete(collectionId: UUID, userId: UUID): Promise<boolean> {
    try {
      return await this.dataSource.manager.transaction(async (manager) => {
        await manager.query(this.DELETE_COLLECTION_AND_ORPHAN_MOLECULES, [collectionId, userId])
        await manager.delete(History, {
          itemId: collectionId,
          itemEntity: HistoryItemEntity.MoleculeCollection,
          userId
        })
        return true
      })
    } catch (e) {
      this.logger.warn(`MoleculeCollection > delete: Error => ${e}`)
      return false
    }
  }

  async searchByName(userId: UUID, query: string | undefined, limit: number = 10, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollection[]> {
    const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
    const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)

    let qb = this.collectionRepo.createQueryBuilder('collection')
      .select(columns.map(col => `collection.${col}`))
      .where('collection.user_id = :userId', { userId });

    if (query) {
      qb = qb.andWhere('collection.name LIKE :query', { query: `%${query}%` })
    }

    qb = qb.orderBy('collection.updatedAt', 'DESC')
      .limit(limit)

    qb = TypeOrmUtils.addJoins(qb, 'collection', fieldsMap)
    return qb.getMany()
  }

  async paginateByUser(
    userId: UUID,
    options: IPaginationOptions,
    searchTerm: string = '',
    fieldsMap?: GraphQLFieldsMap,
  ): Promise<Pagination<MoleculeCollection>> {
    // Prendi i campi richiesti dentro "items"
    const itemsFields = fieldsMap?.items ? Object.keys(fieldsMap.items).filter(k => k !== '__typename') : [];
    // I campi "esterni" non servono nella select
    // Unisci ai requiredFields
    const columns = GraphqlUtils.ensureRequiredFields(itemsFields, this.REQUIRED_FIELDS).filter(c => c !== 'itemsCount')

    let qb = this.collectionRepo.createQueryBuilder('collection')
      .select(columns.map(col => `collection.${col}`))
      .where('collection.user_id = :userId', { userId })

    if (searchTerm.trim()) {
      qb = qb.andWhere('collection.name ILIKE :query', { query: `%${searchTerm}%` })
    }

    qb = qb.orderBy('collection.touchedAt', 'DESC')
    // le join sulle relazioni puoi farle se richieste

    return paginate<MoleculeCollection>(qb, options)
  }



}
