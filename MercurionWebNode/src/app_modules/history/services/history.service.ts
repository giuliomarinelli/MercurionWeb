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

    async getPaginatedHistory(userId: UUID, options: IPaginationOptions): Promise<Pagination<HistoryDTO>> {
        const qb = this.historyRepo.createQueryBuilder('h')
            .where('h.userId = :userId', { userId })
            .orderBy('h.touchedAt', 'DESC');

        const page = await paginate<History>(qb, options);

        // entity -> set di itemId unici in ordine di apparizione
        const tmp = new Map<HistoryItemEntityEnum, Set<UUID>>();
        for (const { itemEntity, itemId } of page.items) {
            if (!tmp.has(itemEntity)) tmp.set(itemEntity, new Set<UUID>());
            tmp.get(itemEntity)!.add(itemId);
        }
        const typeMap = new Map<HistoryItemEntityEnum, UUID[]>(
            [...tmp.entries()].map(([k, v]) => [k, [...v]])
        );

        // mappa globale: `${entity}:${id}` -> name
        const nameByKey = new Map<string, string>();

        for (const entity of typeMap.keys()) {
            const itemIds = typeMap.get(entity)!;
            if (itemIds.length === 0) continue;

            if (entity === HistoryItemEntityEnum.MoleculeCollection) {
                const qb = this.dataSource.getRepository(MoleculeCollection)
                    .createQueryBuilder('c')
                    .select(['c.id', 'c.name'])
                    .where('c.userId = :userId', { userId })
                    .andWhere('c.id IN (:...itemIds)', { itemIds });

                const orderExpr = `array_position(ARRAY[${itemIds.map((_, i) => `:p${i}`).join(',')}]::uuid[], c.id)`;
                qb.orderBy(orderExpr, 'ASC');
                itemIds.forEach((v, i) => qb.setParameter(`p${i}`, v));

                const rows = await qb.getMany();
                for (const r of rows) nameByKey.set(`${entity}:${r.id}`, r.name ?? 'N/A');

            } else if (entity === HistoryItemEntityEnum.MoleculeCollectionItem) {
                const qb = this.dataSource.getRepository(MoleculeCollectionItemEntity)
                    .createQueryBuilder('c')
                    .select([
                        'c.id',
                        'c.name',
                        // usa uno dei due form in base alla tua entity
                        'c.chemblMolregno', // <-- se la colonna mappata è questa
                        // 'c.chembl_molregno as "chemblMolregno"', // <-- oppure alias raw
                        'c.type',
                    ])
                    .where('c.userId = :userId', { userId })
                    .andWhere('c.id IN (:...itemIds)', { itemIds });

                const orderExpr = `array_position(ARRAY[${itemIds.map((_, i) => `:p${i}`).join(',')}]::uuid[], c.id)`;
                qb.orderBy(orderExpr, 'ASC');
                itemIds.forEach((v, i) => qb.setParameter(`p${i}`, v));

                const rows = await qb.getMany();

                await Promise.all(rows.map(async (r) => {
                    if (TypeGuards.isChemblMolecule(r)) {
                        const { preferredName } = await this.moleculeService.getDetailByMolregno(String(r.chemblMolregno));
                        nameByKey.set(`${entity}:${r.id}`, preferredName ?? `Lead ${r.chemblMolregno}`);
                    } else if (TypeGuards.isCustomMolecule(r)) {
                        nameByKey.set(`${entity}:${r.id}`, r.name ?? 'Lead sconosciuto');
                    } else {
                        nameByKey.set(`${entity}:${r.id}`, 'N/A');
                    }
                }));
            }

            // altri case… stesso schema: seleziona id+nome, compila nameByKey
        }

        const items: HistoryDTO[] = page.items.map((it) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { userId: _omit, ...rest } = it;
            const key = `${it.itemEntity}:${it.itemId}`;
            const itemName = nameByKey.get(key) ?? 'N/A';
            return { ...rest, itemName } as HistoryDTO;
        });

        return { ...page, items };
    }


}


