import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { History } from '../Models/entities/history.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate';
import { HistoryDTO } from '../Models/DTO/history.dto';
import { UUID } from 'crypto';
import { HistoryItemEntity as HistoryItemEntityEnum } from '../Models/enums/history-item-entity.enum';
import { MoleculeCollection } from 'src/app_modules/molecule-collection/Models/entities/molecule-collection.entity';
import { MoleculeCollectionItemEntity } from 'src/app_modules/molecule-collection/Models/entities/molecule-collection-item.entity';
import { MoleculeService } from 'src/app_modules/meilisearch/services/molecule.service';
import { TypeGuards } from 'src/utils/type-guards/type-guards';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';

@Injectable()
export class HistoryService {

    private readonly logger: MeiliContextLogger

    constructor(
        @InjectRepository(History)
        private readonly historyRepo: Repository<History>,
        private readonly dataSource: DataSource,
        private readonly moleculeService: MoleculeService,
        loggerFactory: MeiliLoggerService
    ) {
        this.logger = loggerFactory.forContext(HistoryService.name)
    }

    async getPaginatedHistory(
        userId: UUID,
        options: IPaginationOptions,
    ): Promise<Pagination<HistoryDTO>> {
        try {
            return this.dataSource.manager.transaction(async (manager) => {
                return this.getPaginatedHistoryWithManager(userId, options, manager)
            })
        } catch (e) {
            this.logger.warn(`Error in History fetch, userId=${userId}`, e as object)
            throw e
        }
    }

    async getPaginatedHistoryWithManager(
        userId: UUID,
        options: IPaginationOptions,
        manager: EntityManager
    ): Promise<Pagination<HistoryDTO>> {
        // Subquery: per ciascuna (itemEntity,itemId) scelgo l'id della riga più recente
        const latestIdsQb = manager.createQueryBuilder(History, 'x')
            .select('x.id', 'id')
            .where('x.userId = :userId', { userId })
            .distinctOn(['x.itemEntity', 'x.itemId'])
            // Ordine usato da DISTINCT ON per scegliere la riga della coppia
            .orderBy('x.itemEntity', 'ASC')
            .addOrderBy('x.itemId', 'ASC')
            .addOrderBy('x.touchedAt', 'DESC')
            .addOrderBy('x.id', 'DESC'); // tie-breaker

        // Query principale: mantengo alias 'h' (entità History) -> paginate può mappare
        const qb = manager.createQueryBuilder(History, 'h')
            .innerJoin(
                '(' + latestIdsQb.getQuery() + ')',
                'dh',
                'dh.id = h.id',
            )
            .setParameters(latestIdsQb.getParameters())
            // Ordinamento finale REALE per UI
            .orderBy('h.touchedAt', 'DESC')
            .addOrderBy('h.id', 'DESC');

        const page = await paginate<History>(qb, options)

        // Raccolgo gli ID per tipo presenti in questa pagina (deduplicati)
        const idsByType = new Map<HistoryItemEntityEnum, Set<UUID>>()
        for (const { itemEntity, itemId } of page.items) {
            if (!idsByType.has(itemEntity)) idsByType.set(itemEntity, new Set<UUID>())
            idsByType.get(itemEntity)!.add(itemId)
        }

        // Risoluzione nomi: `${entity}:${id}` -> name
        const nameByKey = new Map<string, string>()

        // ---- MoleculeCollection
        {
            const itemIds = [...(idsByType.get(HistoryItemEntityEnum.MoleculeCollection) ?? [])];
            if (itemIds.length) {
                const rows = await manager.createQueryBuilder(MoleculeCollection, 'c')
                    .select(['c.id', 'c.name'])
                    .where('c.userId = :userId', { userId })
                    .andWhere('c.id IN (:...itemIds)', { itemIds })
                    .getMany()

                for (const r of rows) {
                    nameByKey.set(`${HistoryItemEntityEnum.MoleculeCollection}:${r.id}`, r.name ?? 'N/A')
                }
            }
        }

        // ---- MoleculeCollectionItem
        {
            const itemIds = [...(idsByType.get(HistoryItemEntityEnum.MoleculeCollectionItem) ?? [])]
            if (itemIds.length) {
                const rows = await manager.createQueryBuilder(MoleculeCollectionItemEntity, 'c')
                    .select(['c.id', 'c.name', 'c.chemblMolregno', 'c.type'])
                    .where('c.userId = :userId', { userId })
                    .andWhere('c.id IN (:...itemIds)', { itemIds })
                    .getMany()

                await Promise.all(rows.map(async (r) => {
                    if (TypeGuards.isChemblMolecule(r)) {
                        const detail = await this.moleculeService.getDetailByMolregno(String(r.chemblMolregno))
                        if (!detail) {
                            return
                        }
                        const { preferredNameIt, preferredName } = detail
                        nameByKey.set(
                            `${HistoryItemEntityEnum.MoleculeCollectionItem}:${r.id}`,
                            preferredNameIt ?? preferredName ?? `Lead ${r.chemblMolregno}`
                        )
                    } else if (TypeGuards.isCustomMolecule(r)) {
                        nameByKey.set(
                            `${HistoryItemEntityEnum.MoleculeCollectionItem}:${r.id}`,
                            r.name ?? 'Lead sconosciuto',
                        )
                    } 
                }))
            }
        }

        // Costruisco i DTO nell’ordine della pagina
        const items: HistoryDTO[] = page.items.map((it) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars
            const { userId: _omit, ...rest } = it
            const key = `${it.itemEntity}:${it.itemId}`
            const itemName = nameByKey.get(key) ?? 'N/A'
            return { ...rest, itemName } as HistoryDTO
        }).filter(h => h.itemName !== 'N/A')

        return { ...page, items }
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


