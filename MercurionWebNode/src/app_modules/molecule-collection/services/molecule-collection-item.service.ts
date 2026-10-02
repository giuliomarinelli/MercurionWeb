import { MoleculeCollectionItemEntity } from 'src/app_modules/molecule-collection/models/entities/molecule-collection-item.entity';
import { MoleculeService } from '../../meilisearch/services/molecule.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/utils/type-orm-utils/type-orm-utils';
import { uuidv7 } from '@kripod/uuidv7';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { PaginatedMoleculeCollectionItem } from '../models/dto/paginated-molecule-collection-item.dto';
import { MoleculeDetail } from 'src/app_modules/meilisearch/models/dto/molecule-detail.gql.dtos';

import { CustomMoleculeItemEntity } from '../models/entities/custom-molecule-item.entity';
import { ChEMBLMoleculeItemEntity } from '../models/entities/chembl-molecule-item.entity';
import { History } from 'src/app_modules/history/models/entities/history.entity';
import { HistoryItemEntity } from 'src/app_modules/history/models/enums/history-item-entity.enum';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from 'src/logging/logger.port';
import { pruneNullCollectionJoins } from '../utils/prune-molecule-collection-joins.util';
import { MoleculeCollectionItemDTO } from '../models/dto/molecule-collection-item.union';
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { runInTransaction } from 'src/persistence/transaction-context'
import {
    MoleculeItemCreateCommand,
    MoleculeItemPatchCommand,
    toMoleculeItemCreatePatch,
    toMoleculeItemPatch
} from '../models/dto/molecule-mutation.commands'


// TODO: valutare un refactoring per dryificare la duplicazione di logica tra questo service e i service delle entità figlie concrete
@Injectable()
export class MoleculeCollectionItemService {

    private readonly logger: LoggerContext

    constructor(
        @InjectRepository(MoleculeCollectionItemEntity)
        private readonly itemRepo: Repository<MoleculeCollectionItemEntity>,
        private readonly moleculeService: MoleculeService,
        private readonly dataSource: DataSource,
        meiliLogger: LoggerPort
    ) {
        this.logger = meiliLogger.forContext(MoleculeCollectionItemService.name)
    }

    async markAsTouched(userId: UUID, itemId: UUID, _flagIds?: string): Promise<boolean> {

        try {
            return await runInTransaction(this.dataSource, async (_context, manager) => {
                return this.markAsTouchedWithManager(userId, itemId, manager, _flagIds)
            })
        } catch (e) {
            this.logger.warn(`MoleculeCollectionItemService > markAsTouched: UPDATE FAILED => ${String(e)}`)
            return false
        }

    }

    async markAsTouchedWithManager(userId: UUID, itemId: UUID, manager: EntityManager, _flagIds?: string): Promise<boolean> {
        
        if (!GeneralUtils.isValidUUIDv7(itemId)) {
            return false
        }

        if (await manager.exists(MoleculeCollectionItemEntity, { where: { userId, id: itemId } })) {
            let flagIds: string = '{}'
            if (_flagIds) {
                try {
                    JSON.parse(_flagIds)
                    flagIds = _flagIds
                } catch {
                    flagIds = '{}'
                }
            }
            const touchedAt = Date.now()
            await manager.update(MoleculeCollectionItemEntity, { userId, id: itemId }, { touchedAt })
            await manager.insert(History, {
                id: uuidv7() as UUID,
                itemEntity: HistoryItemEntity.MoleculeCollectionItem,
                itemId,
                touchedAt,
                userId,
                flagIds
            })
            return true
        }
        return false
    }

    async markManyAsTouchedWithManager(userId: UUID, itemIds: UUID[], manager: EntityManager): Promise<void> {
        const ids = Array.from(new Set(itemIds))
        if (ids.length === 0) return
        const owned = await manager.find(MoleculeCollectionItemEntity, {
            where: { userId, id: In(ids) },
            select: { id: true }
        })
        const ownedIds = owned.map(item => item.id)
        if (ownedIds.length === 0) return
        const touchedAt = Date.now()
        await manager.update(MoleculeCollectionItemEntity, { userId, id: In(ownedIds) }, { touchedAt })
        await manager.insert(History, ownedIds.map(itemId => ({
            id: uuidv7() as UUID,
            itemEntity: HistoryItemEntity.MoleculeCollectionItem,
            itemId,
            touchedAt,
            userId,
            flagIds: '{}'
        })))
    }

    async create(userId: UUID, input: MoleculeItemCreateCommand): Promise<MoleculeCollectionItemEntity> {
        const entity = this.itemRepo.create({
            id: uuidv7() as UUID,
            ...toMoleculeItemCreatePatch(input),
            userId
        })
        const persisted = await this.itemRepo.save(entity)
        await this.markAsTouched(userId, persisted.id)
        return persisted
    }

    async findOne(
        id: UUID,
        userId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<MoleculeCollectionItemEntity | null> {
        const DB_FIELDS = [
            'id', 'type', 'userId', 'label', 'notes', 'createdAt', 'updatedAt', 'touchedAt',
            'canonicalSmiles', 'molFormula', 'name', 'propertiesJson', 'chemblMolregno'
        ];

        const wants = (map: GraphQLFieldsMap, path: string[]): boolean => {
            let cur: unknown = map;
            for (const p of path) {
                if (typeof cur !== 'object' || cur === null || Array.isArray(cur)) return false;
                cur = (cur as Record<string, unknown>)[p];
            }
            return cur !== undefined;
        };

        const requestedItemCols = Object.keys(fieldsMap ?? {}).filter(k => DB_FIELDS.includes(k));
        if (wants(fieldsMap, ['chemblDetails']) && !requestedItemCols.includes('chemblMolregno')) {
            requestedItemCols.push('chemblMolregno')
        }
        const itemCols = requestedItemCols.length ? requestedItemCols : DB_FIELDS;

        let qb = this.itemRepo
            .createQueryBuilder('item')
            .select(itemCols.map(c => `item.${c}`))
            .where('item.id = :id', { id })
            .andWhere('item.user_id = :userId', { userId })
            .distinct(true);

        // joins
        if (wants(fieldsMap, ['joins'])) {
            // filtro anche i join per user (visto che la tabella ha user_id)
            qb = qb.leftJoin('item.joins', 'j', 'j.user_id = :userId', { userId });

            if (wants(fieldsMap, ['joins', 'id'])) {
                qb = qb.addSelect('j.id', 'j_id');
            }

            // collection
            if (wants(fieldsMap, ['joins', 'collection'])) {
                qb = qb.leftJoin('j.collection', 'c', 'c.user_id = :userId', { userId });

                const COL_ALLOWED = ['id', 'name', 'createdAt', 'updatedAt', 'touchedAt'];
                const colFieldsMap = fieldsMap.joins?.collection ?? {};

                const colCols = COL_ALLOWED.filter(k => colFieldsMap[k] !== undefined);
                if (colCols.length) {
                    qb = qb.addSelect(colCols.map(cn => `c.${cn}`));
                }

                // itemsCount
                if (wants(fieldsMap, ['joins', 'collection', 'itemsCount'])) {
                    qb = qb.loadRelationCountAndMap('c.itemsCount', 'c.items', 'items', relQb =>
                        relQb.andWhere('items.user_id = :userId', { userId }));
                }

                // === ORDINAMENTO: se ci sono join+collection, ordina per c.updatedAt DESC ===
                // Per Postgres + DISTINCT: assicurati che la colonna nell'ORDER BY sia anche nel SELECT.
                if (!colCols.includes('updatedAt')) {
                    qb = qb.addSelect('c.updatedAt'); // selezione “silenziosa” per supportare ORDER BY
                }
                qb = qb.addOrderBy('c.updatedAt', 'DESC', 'NULLS LAST')
                    .addOrderBy('j.id', 'ASC'); // tie-break stabile
            }
        }

        const entity = await qb.getOne();
        return pruneNullCollectionJoins(entity);
    }

    async findOneDTO(
        itemId: UUID,
        userId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<MoleculeCollectionItemDTO | null> {
        // Delego al metodo già esistente
        const item = await this.findOne(itemId, userId, fieldsMap);
        if (!item) {
            return null
        }

        // Preparo la mappa dettagli solo se è un item ChEMBL
        const detailsMap: Record<string, MoleculeDetail> = {};
        if (this.isChemblItem(item)) {
            const chemblMolregno = String(item.chemblMolregno);
            const details = (await this.moleculeService.getDetailsByMolregnosByKey([chemblMolregno])).get(chemblMolregno);
            if (details) {
                detailsMap[chemblMolregno] = details;
            }
        }

        // Applico la trasformazione polimorfica centralizzata
        return this.toPolymorphicDto(item, detailsMap);
    }

    async findAllByUser(
        userId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<MoleculeCollectionItemDTO[]> {
        const DB_FIELDS = [
            'id', 'type', 'userId', 'label', 'notes', 'createdAt', 'updatedAt', 'touchedAt',
            'canonicalSmiles', 'molFormula', 'name', 'propertiesJson', 'chemblMolregno'
        ]
        const scalarFields = GraphQLUtils.getScalarFields(fieldsMap)
            .filter(field => DB_FIELDS.includes(field))
        if (
            fieldsMap.chemblDetails
            && !scalarFields.includes('chemblMolregno')
        ) {
            scalarFields.push('chemblMolregno')
        }
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, ['id', 'type'])
        let qb = this.itemRepo.createQueryBuilder('item')
            .select(columns.map(col => `item.${col}`))
            .where('item.user_id = :userId', { userId })
        qb = TypeOrmUtils.addJoins(
            qb,
            'item',
            TypeOrmUtils.filterJoinsForEntity(fieldsMap, ['joins'])
        )
        const entities = await qb.getMany()
        pruneNullCollectionJoins(entities)

        const chemblItems = entities.filter(
            (item): item is ChEMBLMoleculeItemEntity => this.isChemblItem(item)
        )
        let detailsMap: Record<string, MoleculeDetail> = {}
        if (fieldsMap.chemblDetails && chemblItems.length > 0) {
            const molregnos = chemblItems.map(item => String(item.chemblMolregno))
            detailsMap = Object.fromEntries(
                await this.moleculeService.getDetailsByMolregnosByKey(molregnos)
            )
        }

        return entities.map(item => this.toPolymorphicDto(item, detailsMap))
    }

    private toPolymorphicDto(
        item: MoleculeCollectionItemEntity,
        detailsMap: Record<string, MoleculeDetail>
    ): MoleculeCollectionItemDTO {
        if (this.isCustomItem(item)) {
            return {
                id: item.id,
                label: item.label,
                notes: item.notes,
                type: 'custom',
                canonicalSmiles: item.canonicalSmiles,
                molFormula: item.molFormula,
                name: item.name,
                propertiesJson: item.propertiesJson,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                touchedAt: item.touchedAt,
                joins: item.joins
            };
        }

        if (this.isChemblItem(item)) {
            const chemblMolregno = String(item.chemblMolregno);
            return {
                id: item.id,
                label: item.label,
                notes: item.notes,
                type: 'chembl',
                chemblMolregno,
                chemblDetails: detailsMap[chemblMolregno] ?? null,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                touchedAt: item.touchedAt,
                joins: item.joins
            };
        }

        throw applicationError(ApplicationErrorCode.MOLECULE_COLLECTION_ITEM_TYPE_UNKNOWN, `UnknownItemType::${item.type}`);
    }

    private isCustomItem(
        item: MoleculeCollectionItemEntity
    ): item is CustomMoleculeItemEntity {
        return item.type === 'custom'
    }

    private isChemblItem(
        item: MoleculeCollectionItemEntity
    ): item is ChEMBLMoleculeItemEntity {
        return item.type === 'chembl'
    }

    async paginateAllByUser(
        userId: UUID,
        options: IPaginationOptions,
        searchTerm: string = '',
        excludeJoinedToCollection: boolean = false,
        collectionId: UUID | null = null,
        fieldsMap: GraphQLFieldsMap,
    ): Promise<PaginatedMoleculeCollectionItem> {
        // Solo campi DB reali!
        const DB_FIELDS = [
            'id', 'type', 'userId', 'label', 'notes', 'createdAt', 'updatedAt', 'touchedAt',
            'canonicalSmiles', 'molFormula', 'name', 'propertiesJson', 'chemblMolregno'
        ];

        // Prendi solo quelli richiesti e realmente esistenti nel DB
        // Union fragments can make graphql-fields expose an empty/partial
        // `items` map. The polymorphic DTO mapper still requires these
        // columns, so never project a partial entity here.
        const requestedFields = fieldsMap?.items
            ? Object.keys(fieldsMap.items).filter(k => DB_FIELDS.includes(k))
            : [];
        const itemsFields = GraphQLUtils.ensureRequiredFields(requestedFields, DB_FIELDS);

        // Base query: tutti gli item dell'utente
        let qb = this.itemRepo.createQueryBuilder('item')
            .select(itemsFields.map(col => `item.${col}`))
            .where('item.userId = :userId', { userId });

        // Se devo escludere quelli già linkati a una collection specifica, uso LEFT JOIN e filtro IS NULL
        if (excludeJoinedToCollection && collectionId) {
            qb = qb
                .leftJoin(
                    'item.joins',
                    'join',
                    'join.collectionId = :collectionId AND join.userId = :userId',
                    { collectionId, userId }
                )
                .andWhere('join.id IS NULL'); // => tieni solo NON già linkati alla collection
        }

        if (searchTerm.trim()) {
            qb = qb.andWhere('item.name ILIKE :query', { query: `%${searchTerm}%` });
        }

        qb = qb.orderBy('item.touchedAt', 'DESC')
            .addOrderBy('item.id', 'ASC');

        // Niente join su campi virtuali!
        const page = await paginate<MoleculeCollectionItemEntity>(qb, options);
        pruneNullCollectionJoins(page.items);

        // Batch ChEMBL
        const chemblItems = page.items.filter(
            (item): item is ChEMBLMoleculeItemEntity => this.isChemblItem(item)
        );
        let detailsMap: Record<string, MoleculeDetail> = {};
        if (chemblItems.length > 0) {
            const molregnos = chemblItems.map(i => String(i.chemblMolregno));
            detailsMap = Object.fromEntries(
                await this.moleculeService.getDetailsByMolregnosByKey(molregnos)
            );
        }

        // Mapping finale ai DTO polimorfici (via metodo estratto)
        const items = page.items.map(i => this.toPolymorphicDto(i, detailsMap));

        // Risposta paginata finale
        return {
            items,
            itemCount: page.meta.itemCount,
            totalItems: page.meta.totalItems ?? 0,
            itemsPerPage: page.meta.itemsPerPage,
            totalPages: page.meta.totalPages ?? 0,
            currentPage: page.meta.currentPage,
        };
    }


    async paginateByCollection(
        userId: UUID,
        collectionId: UUID,
        options: IPaginationOptions,
        searchTerm: string = '',
        excluded: boolean = false,
        fieldsMap: GraphQLFieldsMap,
    ): Promise<PaginatedMoleculeCollectionItem> {
        // Solo campi DB reali!
        const DB_FIELDS = [
            'id', 'type', 'userId', 'label', 'notes', 'createdAt', 'updatedAt', 'touchedAt',
            'canonicalSmiles', 'molFormula', 'name', 'propertiesJson', 'chemblMolregno'
        ];

        // See paginateAllByUser: the DTO mapper needs the complete persisted
        // shape even when the GraphQL selection is expressed via fragments.
        const requestedFields = fieldsMap?.items
            ? Object.keys(fieldsMap.items).filter(k => DB_FIELDS.includes(k))
            : [];
        const itemsFields = GraphQLUtils.ensureRequiredFields(requestedFields, DB_FIELDS);

        // LEFT JOIN condizionato sulla collection corrente
        let qb = this.itemRepo.createQueryBuilder('item')
            .where('item.userId = :userId', { userId })
            .leftJoin(
                'item.joins',
                'join',
                'join.collectionId = :collectionId AND join.userId = :userId',
                { collectionId, userId }
            )
            .select(itemsFields.map(col => `item.${col}`));

        // Filtri:
        // - excluded === true  -> togli già linkati  -> join.id IS NULL
        // - excluded === false -> solo già linkati   -> join.id IS NOT NULL
        if (excluded) {
            qb = qb.andWhere('join.id IS NULL');
        } else {
            qb = qb.andWhere('join.id IS NOT NULL');
        }

        if (searchTerm?.trim()) {
            qb = qb.andWhere('item.name ILIKE :query', { query: `%${searchTerm}%` });
        }

        qb = qb.orderBy('item.touchedAt', 'DESC')
            .addOrderBy('item.id', 'ASC');

        // Niente join su campi virtuali!
        const page = await paginate<MoleculeCollectionItemEntity>(qb, options);
        pruneNullCollectionJoins(page.items);

        // Batch ChEMBL enrichment
        const chemblItems = page.items.filter(
            (item): item is ChEMBLMoleculeItemEntity => this.isChemblItem(item)
        );
        let detailsMap: Record<string, MoleculeDetail> = {};
        if (chemblItems.length > 0) {
            const molregnos = chemblItems.map(i => String(i.chemblMolregno));
            detailsMap = Object.fromEntries(
                await this.moleculeService.getDetailsByMolregnosByKey(molregnos)
            );
        }

        // Mapping finale ai DTO polimorfici
        const items = page.items.map(i => this.toPolymorphicDto(i, detailsMap));

        // Risposta paginata
        return {
            items,
            itemCount: page.meta.itemCount,
            totalItems: page.meta.totalItems ?? 0,
            itemsPerPage: page.meta.itemsPerPage,
            totalPages: page.meta.totalPages ?? 0,
            currentPage: page.meta.currentPage,
        };
    }


    async update(id: UUID, userId: UUID, input: MoleculeItemPatchCommand, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollectionItemEntity | null> {
        await this.itemRepo.update({ id, userId }, {
            ...toMoleculeItemPatch(input),
            updatedAt: Date.now()
        })
        await this.markAsTouched(userId, id)
        return this.findOne(id, userId, fieldsMap)
    }

    async delete(id: UUID, userId: UUID): Promise<boolean> {
        try {
            let ok = false
            await runInTransaction(this.dataSource, async (_context, manager) => {
                const resItem = await manager.delete(MoleculeCollectionItemEntity, { id, userId })
                ok = (resItem.affected ?? 0) > 0
                if (!ok) return
                await manager.delete(History, {
                    itemId: id,
                    itemEntity: HistoryItemEntity.MoleculeCollectionItem,
                    userId
                })
            })
            return ok
        } catch {
            return false
        }
    }

}
