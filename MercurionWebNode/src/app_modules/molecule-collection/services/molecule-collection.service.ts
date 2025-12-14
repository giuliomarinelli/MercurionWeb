/* eslint-disable no-useless-escape */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/utils/type-orm-utils/type-orm-utils';
import { MoleculeCollection } from '../Models/entities/molecule-collection.entity';
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate';
import { History } from 'src/app_modules/history/Models/entities/history.entity';
import { HistoryItemEntity } from 'src/app_modules/history/Models/enums/history-item-entity.enum';
import { uuidv7 } from '@kripod/uuidv7';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { MoleculeCollectionItemJoin } from '../Models/entities/molecule-collection-item-join.entity';
import { ChEMBLMoleculeItemEntity } from '../Models/entities/chembl-molecule-item.entity';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { pruneNullCollectionJoins } from '../utils/prune-molecule-collection-joins.util';

@Injectable()
export class MoleculeCollectionService {

  private readonly REQUIRED_FIELDS = ['id', 'name']

  // Query set-based con lock “a gruppo”
  private readonly CREATE_MANY_COLLECTIONS_QUERY = `WITH payload AS (
  SELECT *
  FROM jsonb_to_recordset($1::jsonb)
       AS t(
         id uuid,
         user_id uuid,        -- UUID ok
         name text,
         created_at bigint,
         updated_at bigint,
         touched_at bigint
       )
),
-- base_name = nome senza eventuale " (n)" finale
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
-- lock per (user_id, base_name)
locks AS (
  SELECT pg_advisory_xact_lock(
           ((hashtextextended(user_id::text, 17))::bigint << 32)
           # (hashtextextended(base_name, 42))::bigint
         )
  FROM (SELECT DISTINCT user_id, base_name FROM norm) d
),
-- ranking locale nel batch
ranked AS (
  SELECT
    n.*,
    ROW_NUMBER() OVER (PARTITION BY user_id, base_name ORDER BY id) - 1 AS rn
  FROM norm n
),
-- stato esistente nel DB: se esiste il plain e qual è il max suffisso
existing AS (
  SELECT
    e.user_id,
    e.base_name,
    -- true se esiste 'base_name' senza suffisso
    BOOL_OR(mc.name = e.base_name) AS has_plain,
    -- massimo numero di suffisso presente (NULL se non ce ne sono)
    MAX( NULLIF( (regexp_match(mc.name, ' \((\d+)\)$'))[1], NULL )::int ) AS max_suffix_num
  FROM (SELECT DISTINCT user_id, base_name FROM norm) e
  LEFT JOIN public.molecule_collections mc
    ON mc.user_id = e.user_id
   AND (mc.name = e.base_name OR mc.name LIKE e.base_name || ' (%)')
  GROUP BY e.user_id, e.base_name
),
-- calcolo indice del suffisso da usare per ciascuna riga del batch
assigned AS (
  SELECT
    r.id,
    r.user_id,
    r.base_name,
    r.created_at,
    r.updated_at,
    r.touched_at,
    CASE
      WHEN COALESCE(e.has_plain, false) = false AND r.rn = 0 THEN 0
      ELSE COALESCE(e.max_suffix_num, 0) + CASE WHEN COALESCE(e.has_plain, false) THEN 1 ELSE 0 END + r.rn
    END AS suffix_idx
  FROM ranked r
  LEFT JOIN existing e
    ON e.user_id = r.user_id AND e.base_name = r.base_name
),
-- costruzione del nome finale con gestione 255 char
final_rows AS (
  SELECT
    id,
    user_id,
    CASE
      WHEN suffix_idx = 0 THEN
        LEFT(base_name, 255)
      ELSE
        -- costruisci il suffisso " (n)"
        -- e tronca il base_name per non superare 255
        LEFT(base_name, GREATEST(1, 255 - char_length(' (' || suffix_idx::text || ')')))
        || ' (' || suffix_idx::text || ')'
    END AS name,
    created_at,
    updated_at,
    touched_at
  FROM assigned
)
INSERT INTO public.molecule_collections
  (id, user_id, name, created_at, updated_at, touched_at)
SELECT id, user_id, name, created_at, updated_at, touched_at
FROM final_rows;
`

  private readonly DELETE_COLLECTION_AND_ORPHAN_MOLECULES_QUERY = `WITH candidates AS (
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

  private readonly logger: MeiliContextLogger

  constructor(
    @InjectRepository(MoleculeCollection)
    private readonly collectionRepo: Repository<MoleculeCollection>,
    private readonly dataSource: DataSource,
    meiliLogger: MeiliLoggerService
  ) {
    this.logger = meiliLogger.forContext(MoleculeCollectionService.name)
  }

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

  private stripTrailingSuffix(name: string): string {
    // rimuove solo il pattern " (123)" a fine stringa
    return name.replace(/ \(\d+\)$/, '')
  }

  private buildNameWithSuffix(baseName: string, suffixIdx: number): string {

    if (suffixIdx === 0) {
      return baseName.slice(0, 255)
    }

    const suffix = ` (${suffixIdx})`
    const maxBaseLen = Math.max(1, 255 - suffix.length)
    return baseName.slice(0, maxBaseLen) + suffix
  }

  private async resolveUniqueCollectionName(
    manager: EntityManager,
    userId: UUID,
    rawName: string
  ): Promise<string> {
    const normalized = GeneralUtils.normalizeSpaces(String(rawName))
    const baseName = this.stripTrailingSuffix(normalized)

    await manager.query(
      `SELECT pg_advisory_xact_lock(
        ((hashtextextended($1::text, 17))::bigint << 32)
        # (hashtextextended($2, 42))::bigint
     );`,
      [String(userId), baseName]
    )

    // stato esistente
    const rows = await manager.query<MoleculeCollection>(
      `
    SELECT
      BOOL_OR(name = $2) AS has_plain,
      MAX( (regexp_match(name, ' \\((\\d+)\\)$'))[1]::int ) AS max_suffix_num
    FROM public.molecule_collections
    WHERE user_id = $1::uuid
      AND (name = $2 OR name LIKE $2 || ' (%)');
    `,
      [String(userId), baseName]
    )

    const hasPlain = Boolean(rows?.[0]?.has_plain)
    const maxSuffixNum = rows?.[0]?.max_suffix_num == null ? null : Number(rows[0].max_suffix_num)

    // stessa logica della query: se non esiste il plain, usa plain (suffix 0) anche se esistono già "(n)"
    const suffixIdx = hasPlain ? ((maxSuffixNum ?? 0) + 1) : 0
    return this.buildNameWithSuffix(baseName, suffixIdx)
  }

  async create(userId: UUID, name: string): Promise<MoleculeCollection> {
    try {
      return this.dataSource.manager.transaction(async (manager) => {

        const now = Date.now()

        const finalName = await this.resolveUniqueCollectionName(manager, userId, name)

        const collection = manager.create(MoleculeCollection, {
          id: uuidv7() as UUID,
          name: finalName,
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
      this.logger.warn(e.message as object)
      throw e
    }
  }

  async duplicate(
    userId: UUID,
    srcCollectionId: UUID,
    newName?: string
  ): Promise<MoleculeCollection | null> {
    try {
      
      return this.dataSource.manager.transaction(async (manager) => {

        const srcCollection = await manager.findOneOrFail(MoleculeCollection, {
          where: {
            id: srcCollectionId,
            userId
          }
        })

        const now = Date.now()
        const uqName = await this.resolveUniqueCollectionName(
          manager,
          userId,
          newName ?? srcCollection.name
        )

        const newCollection = manager.create(MoleculeCollection, {
          id: uuidv7() as UUID,
          name: uqName,
          userId,
          createdAt: now,
          updatedAt: now,
          touchedAt: now
        })

        const newCollectionPers = await manager.save(MoleculeCollection, newCollection)

        const srcJoins = await manager.find(MoleculeCollectionItemJoin, {
          where: { userId, collectionId: srcCollectionId },
          select: {
            item: true
          }
        })

        const rows = srcJoins.map(j => ({
          id: uuidv7() as UUID,
          userId,
          collectionId: newCollectionPers.id,
          itemId: j.itemId,
        }))

        await manager.insert(MoleculeCollectionItemJoin, rows)
        return newCollectionPers

      })
    } catch {
      return null
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
    const scalarFields = GraphQLUtils.getScalarFields(fieldsMap)
    const columns = GraphQLUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)

    let qb = this.collectionRepo.createQueryBuilder('collection')
      .select(columns.map(col => `collection.${col}`))
      .where('collection.id = :id', { id })
      .andWhere('collection.user_id = :userId', { userId })

    qb = TypeOrmUtils.addJoins(qb, 'collection', fieldsMap)

    const collection = await qb.getOne()
    return pruneNullCollectionJoins(collection)
  }

  async findAllByUser(userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollection[]> {
    const scalarFields = GraphQLUtils.getScalarFields(fieldsMap)
    const columns = GraphQLUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)

    let qb = this.collectionRepo.createQueryBuilder('collection')
      .select(columns.map(col => `collection.${col}`))
      .where('collection.user_id = :userId', { userId })
      .orderBy('collection.name', 'ASC')

    qb = TypeOrmUtils.addJoins(qb, 'collection', fieldsMap)

    const rows = await qb.getMany()
    return pruneNullCollectionJoins(rows)
  }

  async update(id: UUID, userId: UUID, input: Partial<MoleculeCollection>, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollection | null> {
    await this.collectionRepo.update({ id, userId }, { ...input, updatedAt: Date.now() })
    await this.markAsTouched(userId, id)
    return this.findOne(id, userId, fieldsMap)
  }

  async delete(collectionId: UUID, userId: UUID): Promise<boolean> {
    try {
      return await this.dataSource.manager.transaction(async (manager) => {
        await manager.query(this.DELETE_COLLECTION_AND_ORPHAN_MOLECULES_QUERY, [collectionId, userId])
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
    const scalarFields = GraphQLUtils.getScalarFields(fieldsMap)
    const columns = GraphQLUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)

    let qb = this.collectionRepo.createQueryBuilder('collection')
      .select(columns.map(col => `collection.${col}`))
      .where('collection.user_id = :userId', { userId });

    if (query) {
      qb = qb.andWhere('collection.name LIKE :query', { query: `%${query}%` })
    }

    qb = qb.orderBy('collection.updatedAt', 'DESC')
      .limit(limit)

    qb = TypeOrmUtils.addJoins(qb, 'collection', fieldsMap)
    const rows = await qb.getMany()
    return pruneNullCollectionJoins(rows)
  }

  async paginateAllByUser(
    userId: UUID,
    options: IPaginationOptions,
    searchTerm: string = '',
    excludeJoinedToMolecule: boolean = false,
    moleculeId: UUID | null = null,
    fieldsMap?: GraphQLFieldsMap,
  ): Promise<Pagination<MoleculeCollection>> {

    const itemsFields = fieldsMap?.items ? Object.keys(fieldsMap.items).filter(k => k !== '__typename') : [];
    const columns = GraphQLUtils.ensureRequiredFields(itemsFields, this.REQUIRED_FIELDS).filter(c => c !== 'itemsCount')

    let qb = this.collectionRepo.createQueryBuilder('collection')
      .select(columns.map(col => `collection.${col}`))
      .where('collection.userId = :userId', { userId })

    if (excludeJoinedToMolecule && moleculeId) {

      const raw = String(moleculeId)
      const isMolregno = /^\d+$/.test(raw)

      if (isMolregno) {
        qb = qb.andWhere(qb2 => {
          const sub = qb2.subQuery()
            .select('1')
            .from(MoleculeCollectionItemJoin, 'j')
            // ChildEntity su STI: TypeORM aggiunge automaticamente il discriminator (type='chembl')
            .innerJoin(ChEMBLMoleculeItemEntity, 'chembl', 'chembl.id = j.itemId AND chembl.chemblMolregno = :molregno')
            .where('j.collectionId = collection.id')
            .getQuery()
          return `NOT EXISTS ${sub}`
        }).setParameter('molregno', Number(raw))
      } else {
        qb = qb.andWhere(qb2 => {
          const sub = qb2.subQuery()
            .select('1')
            .from(MoleculeCollectionItemJoin, 'j')
            .where('j.collectionId = collection.id')
            .andWhere('j.itemId = :itemId')
            .getQuery();
          return `NOT EXISTS ${sub}`
        }).setParameter('itemId', raw)
      }
    }

    if (searchTerm.trim()) {
      qb = qb.andWhere('collection.name ILIKE :query', { query: `%${searchTerm}%` })
    }

    qb = qb.orderBy('collection.touchedAt', 'DESC')

    const paginated = await paginate<MoleculeCollection>(qb, options)
    pruneNullCollectionJoins(paginated.items)
    return paginated

  }



}
