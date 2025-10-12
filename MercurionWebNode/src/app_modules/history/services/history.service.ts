import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { History } from '../Models/entities/history.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate';
import { HistoryDTO } from '../Models/DTO/history.dto';
import { UUID } from 'crypto';
import { HistoryItemEntity as HistoryItemEntityEnum } from '../Models/enums/history-item-entity.enum';
import { MoleculeCollection } from 'src/app_modules/user/Models/entities/molecule-collection/molecule-collection.entity';
import { MoleculeCollectionItemEntity } from 'src/app_modules/user/Models/entities/molecule-collection/molecule-collection-item.entity';
import { MoleculeService } from 'src/app_modules/meilisearch/services/molecule.service';
import { TypeGuards } from 'src/utils/type-guards/type-guards';

@Injectable()
export class HistoryService {

    constructor(
        @InjectRepository(History)
        private readonly historyRepo: Repository<History>,
        private readonly dataSource: DataSource,
        private readonly moleculeService: MoleculeService
    ) { }

    async getPaginatedHistory(
        userId: UUID,
        options: IPaginationOptions,
    ): Promise<Pagination<HistoryDTO>> {
        // Subquery: per ciascuna (itemEntity,itemId) scelgo l'id della riga più recente
        const latestIdsQb = this.historyRepo.createQueryBuilder('x')
            .select('x.id', 'id')
            .where('x.userId = :userId', { userId })
            .distinctOn(['x.itemEntity', 'x.itemId'])
            // Ordine usato da DISTINCT ON per scegliere la riga della coppia
            .orderBy('x.itemEntity', 'ASC')
            .addOrderBy('x.itemId', 'ASC')
            .addOrderBy('x.touchedAt', 'DESC')
            .addOrderBy('x.id', 'DESC'); // tie-breaker

        // Query principale: mantengo alias 'h' (entità History) -> paginate può mappare
        const qb = this.historyRepo.createQueryBuilder('h')
            .innerJoin(
                '(' + latestIdsQb.getQuery() + ')',
                'dh',
                'dh.id = h.id',
            )
            .setParameters(latestIdsQb.getParameters())
            // Ordinamento finale REALE per UI
            .orderBy('h.touchedAt', 'DESC')
            .addOrderBy('h.id', 'DESC');

        const page = await paginate<History>(qb, options);

        // Raccolgo gli ID per tipo presenti in questa pagina (deduplicati)
        const idsByType = new Map<HistoryItemEntityEnum, Set<UUID>>();
        for (const { itemEntity, itemId } of page.items) {
            if (!idsByType.has(itemEntity)) idsByType.set(itemEntity, new Set<UUID>());
            idsByType.get(itemEntity)!.add(itemId);
        }

        // Risoluzione nomi: `${entity}:${id}` -> name
        const nameByKey = new Map<string, string>();

        // ---- MoleculeCollection
        {
            const itemIds = [...(idsByType.get(HistoryItemEntityEnum.MoleculeCollection) ?? [])];
            if (itemIds.length) {
                const rows = await this.dataSource.getRepository(MoleculeCollection)
                    .createQueryBuilder('c')
                    .select(['c.id', 'c.name'])
                    .where('c.userId = :userId', { userId })
                    .andWhere('c.id IN (:...itemIds)', { itemIds })
                    .getMany();

                for (const r of rows) {
                    nameByKey.set(`${HistoryItemEntityEnum.MoleculeCollection}:${r.id}`, r.name ?? 'N/A');
                }
            }
        }

        // ---- MoleculeCollectionItem
        {
            const itemIds = [...(idsByType.get(HistoryItemEntityEnum.MoleculeCollectionItem) ?? [])];
            if (itemIds.length) {
                const rows = await this.dataSource.getRepository(MoleculeCollectionItemEntity)
                    .createQueryBuilder('c')
                    .select(['c.id', 'c.name', 'c.chemblMolregno', 'c.type'])
                    .where('c.userId = :userId', { userId })
                    .andWhere('c.id IN (:...itemIds)', { itemIds })
                    .getMany();

                await Promise.all(rows.map(async (r) => {
                    if (TypeGuards.isChemblMolecule(r)) {
                        const { preferredName } =
                            await this.moleculeService.getDetailByMolregno(String(r.chemblMolregno));
                        nameByKey.set(
                            `${HistoryItemEntityEnum.MoleculeCollectionItem}:${r.id}`,
                            preferredName ?? `Lead ${r.chemblMolregno}`,
                        );
                    } else if (TypeGuards.isCustomMolecule(r)) {
                        nameByKey.set(
                            `${HistoryItemEntityEnum.MoleculeCollectionItem}:${r.id}`,
                            r.name ?? 'Lead sconosciuto',
                        );
                    } else {
                        nameByKey.set(`${HistoryItemEntityEnum.MoleculeCollectionItem}:${r.id}`, 'N/A');
                    }
                }));
            }
        }

        // Costruisco i DTO nell’ordine della pagina
        const items: HistoryDTO[] = page.items.map((it) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unused-vars
            const { userId: _omit, ...rest } = it as any;
            const key = `${it.itemEntity}:${it.itemId}`;
            const itemName = nameByKey.get(key) ?? 'N/A';
            return { ...rest, itemName } as HistoryDTO;
        });

        return { ...page, items };
    }




}


