import { Injectable } from '@nestjs/common'
import { DataSource, EntityManager, Repository } from 'typeorm'
import { InjectRepository } from '@nestjs/typeorm'
import { IPaginationOptions, paginateRaw, Pagination } from 'nestjs-typeorm-paginate'
import { UUID } from 'crypto'
import { History } from '../models/entities/history.entity'
import { HistoryDTO, TinyHistoryDTO } from '../models/dto/history.dto'
import { HistoryItemEntity as HistoryItemEntityEnum } from '../models/enums/history-item-entity.enum'
import { MoleculeCollection } from 'src/app_modules/molecule-collection/models/entities/molecule-collection.entity'
import { MoleculeCollectionItemEntity } from 'src/app_modules/molecule-collection/models/entities/molecule-collection-item.entity'
import { MoleculeService } from 'src/app_modules/meilisearch/services/molecule.service'
import { LoggerPort, LoggerContext } from 'src/logging/logger.port'
import { utcInstantFromEpochMs } from 'src/utils/temporal/temporal'
import { runInTransaction, transactionManager, type TransactionContext } from 'src/persistence/transaction-context'
import {
    HistoryCollectionNameProjection,
    HistoryItemNameProjection,
    HistoryQueryProjection,
} from '../models/dto/history-read-model.types'

@Injectable()
export class HistoryService {

    private readonly logger: LoggerContext

    constructor(
        @InjectRepository(History)
        private readonly historyRepo: Repository<History>,
        private readonly dataSource: DataSource,
        private readonly moleculeService: MoleculeService,
        loggerFactory: LoggerPort,
    ) {
        this.logger = loggerFactory.forContext(HistoryService.name)
    }

    async getPaginatedHistory(
        userId: UUID,
        options: IPaginationOptions,
    ): Promise<Pagination<HistoryDTO>> {
        try {
            return runInTransaction(this.dataSource, async (_context, manager) =>
                this.getPaginatedHistoryWithManager(userId, options, manager),
            )
        } catch (e) {
            this.logger.warn(`Error in History fetch, userId=${userId}`, e as object)
            throw e
        }
    }

    async getPaginatedHistoryWithManager(
        userId: UUID,
        options: IPaginationOptions,
        manager: EntityManager,
    ): Promise<Pagination<HistoryDTO>> {
        const latestIdsQb = manager.createQueryBuilder(History, 'x')
            .select('x.id', 'id')
            .where('x.userId = :userId', { userId })
            .distinctOn(['x.itemEntity', 'x.itemId'])
            .orderBy('x.itemEntity', 'ASC')
            .addOrderBy('x.itemId', 'ASC')
            .addOrderBy('x.touchedAt', 'DESC')
            .addOrderBy('x.id', 'DESC')

        const qb = manager.createQueryBuilder(History, 'h')
            .innerJoin(
                '(' + latestIdsQb.getQuery() + ')',
                'dh',
                'dh.id = h.id',
            )
            .setParameters(latestIdsQb.getParameters())
            .select('h.id', 'id')
            .addSelect('h.itemEntity', 'itemEntity')
            .addSelect('h.touchedAt', 'touchedAt')
            .addSelect('h.itemId', 'itemId')
            .addSelect('h.flagIds', 'flagIds')
            .orderBy('h.touchedAt', 'DESC')
            .addOrderBy('h.id', 'DESC')

        const page = await paginateRaw<History>(qb, options)
        const projectionRows = page.items as unknown as HistoryQueryProjection[]
        const idsByType = new Map<HistoryItemEntityEnum, Set<string>>()

        for (const row of projectionRows) {
            const ids = idsByType.get(row.itemEntity) ?? new Set<string>()
            ids.add(row.itemId)
            idsByType.set(row.itemEntity, ids)
        }

        const nameByKey = await this.resolveNamesByKey(userId, idsByType, manager)

        // Missing/deleted resources remain in the page as N/A so itemCount and
        // page boundaries describe the stable history projection, not enrichment success.
        const items: HistoryDTO[] = projectionRows.map((row) => ({
            id: row.id,
            itemEntity: row.itemEntity,
            touchedAt: utcInstantFromEpochMs(Number(row.touchedAt)),
            itemId: row.itemId,
            flagIds: row.flagIds,
            itemName: nameByKey.get(`${row.itemEntity}:${row.itemId}`) ?? 'N/A',
        }))

        return { ...page, items }
    }

    private async resolveNamesByKey(
        userId: UUID,
        idsByType: Map<HistoryItemEntityEnum, Set<string>>,
        manager: EntityManager,
    ): Promise<Map<string, string>> {
        const nameByKey = new Map<string, string>()
        const collectionIds = [
            ...(idsByType.get(HistoryItemEntityEnum.MoleculeCollection) ?? []),
        ]

        if (collectionIds.length) {
            const rows = await manager.createQueryBuilder(MoleculeCollection, 'collection')
                .select('collection.id', 'id')
                .addSelect('collection.name', 'name')
                .where('collection.userId = :userId', { userId })
                .andWhere('collection.id IN (:...collectionIds)', { collectionIds })
                .getRawMany<HistoryCollectionNameProjection>()

            for (const row of rows) {
                nameByKey.set(
                    `${HistoryItemEntityEnum.MoleculeCollection}:${row.id}`,
                    row.name ?? 'N/A',
                )
            }
        }

        const itemIds = [
            ...(idsByType.get(HistoryItemEntityEnum.MoleculeCollectionItem) ?? []),
        ]
        if (!itemIds.length) {
            return nameByKey
        }

        const rows = await manager.createQueryBuilder(MoleculeCollectionItemEntity, 'item')
            .select('item.id', 'id')
            .addSelect('item.type', 'type')
            .addSelect('item.name', 'name')
            .addSelect('item.chemblMolregno', 'chemblMolregno')
            .where('item.userId = :userId', { userId })
            .andWhere('item.id IN (:...itemIds)', { itemIds })
            .getRawMany<HistoryItemNameProjection>()

        const chemblMolregnos = [
            ...new Set(
                rows
                    .filter((row) => row.type === 'chembl' && row.chemblMolregno !== null)
                    .map((row) => String(row.chemblMolregno)),
            ),
        ]
        const detailsByMolregno = await this.moleculeService.getDetailsByMolregnosByKey(
            chemblMolregnos,
        )

        for (const row of rows) {
            const key = `${HistoryItemEntityEnum.MoleculeCollectionItem}:${row.id}`
            if (row.type === 'custom') {
                nameByKey.set(key, row.name ?? 'N/A')
                continue
            }

            if (row.type === 'chembl' && row.chemblMolregno !== null) {
                const detail = detailsByMolregno.get(String(row.chemblMolregno))
                nameByKey.set(
                    key,
                    detail?.preferredNameIt ?? detail?.preferredName ?? 'N/A',
                )
            }
        }

        return nameByKey
    }

    async getRecentHistoryTinyDistinctPerDay(
        userId: UUID,
        lookbackDays = 7,
        context?: TransactionContext,
    ): Promise<TinyHistoryDTO[]> {
        if (context) {
            return this.getRecentHistoryTinyDistinctPerDayWithManager(
                userId,
                lookbackDays,
                transactionManager(context),
            )
        }

        return runInTransaction(this.dataSource, async (_context, manager) =>
            this.getRecentHistoryTinyDistinctPerDayWithManager(userId, lookbackDays, manager),
        )
    }

    async getRecentHistoryTinyDistinctPerDayWithManager(
        userId: UUID,
        lookbackDays: number,
        manager: EntityManager,
    ): Promise<TinyHistoryDTO[]> {
        const days = Math.max(1, lookbackDays)
        const now = Date.now()
        const msPerDay = 24 * 60 * 60 * 1000
        const cutoff = now - days * msPerDay

        const rows = await manager
            .getRepository(History)
            .createQueryBuilder('h')
            .select('h.id', 'id')
            .addSelect('h.itemEntity', 'itemEntity')
            .addSelect('h.itemId', 'itemId')
            .addSelect('h.touchedAt', 'touchedAt')
            .where('h.userId = :userId', { userId })
            .andWhere('h.touchedAt >= :cutoff', { cutoff })
            .orderBy('h.touchedAt', 'DESC')
            .addOrderBy('h.id', 'DESC')
            .getRawMany<HistoryQueryProjection>()

        const seen = new Map<string, TinyHistoryDTO>()

        for (const row of rows) {
            const ts = Number(row.touchedAt)
            if (!Number.isFinite(ts)) {
                continue
            }

            const d = new Date(ts)
            d.setHours(0, 0, 0, 0)
            const key = `${d.getTime()}:${row.itemEntity}:${row.itemId}`

            if (!seen.has(key)) {
                seen.set(key, {
                    id: row.id,
                    itemEntity: row.itemEntity,
                    itemId: row.itemId,
                    touchedAt: utcInstantFromEpochMs(ts),
                })
            }
        }

        return Array.from(seen.values()).sort((a, b) => {
            const aId = String(a.id)
            const bId = String(b.id)
            if (aId === bId) return 0
            return aId < bId ? 1 : -1
        })
    }

    async deleteHistory(userId: UUID): Promise<boolean> {
        try {
            await this.historyRepo.delete({ userId })
            return true
        } catch (e) {
            this.logger.warn(`Error trying to delete history, userId=${userId}`, e as object)
            return false
        }
    }
}
