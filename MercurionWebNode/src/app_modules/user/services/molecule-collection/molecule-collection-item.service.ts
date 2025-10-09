import { MoleculeService } from './../../../meilisearch/services/molecule.service';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { MoleculeCollectionItemEntity } from '../../Models/entities/molecule-collection/molecule-collection-item.entity';
import { CreateMoleculeItemInput } from '../../Models/DTO/molecule-collection/create-molecule-item.input';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/type-orm-utils/type-orm-utils';
import { uuidv7 } from '@kripod/uuidv7';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { PaginatedMoleculeCollectionItem } from '../../Models/DTO/molecule-collection/paginated-molecule-collection-item.dto';
import { CustomMoleculeItemDTO } from '../../Models/DTO/molecule-collection/custom-molecule-item.dto';
import { ChEMBLMoleculeItemDTO } from '../../Models/DTO/molecule-collection/chembl-molecule-item.dto';
import { MoleculeDetail } from 'src/app_modules/meilisearch/Models/DTO/molecule-detail.gql.dtos';
import { RpcException } from '@nestjs/microservices';
import { CustomMoleculeItemEntity } from '../../Models/entities/molecule-collection/custom-molecule-item.entity';
import { ChEMBLMoleculeItemEntity } from '../../Models/entities/molecule-collection/chembl-molecule-item.entity';


// TODO: valutare un refactoring per dryificare la duplicazione di logica tra questo service e i service delle entità figlie concrete
@Injectable()
export class MoleculeCollectionItemService {

    constructor(
        @InjectRepository(MoleculeCollectionItemEntity)
        private readonly itemRepo: Repository<MoleculeCollectionItemEntity>,
        private readonly moleculeService: MoleculeService
    ) { }

    async create(userId: UUID, input: CreateMoleculeItemInput): Promise<MoleculeCollectionItemEntity> {
        const entity = this.itemRepo.create({ id: uuidv7() as UUID, ...input, userId })
        return this.itemRepo.save(entity)
    }

    async findOne(
        id: UUID,
        userId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<MoleculeCollectionItemEntity | null> {
        const DB_FIELDS = [
            'id', 'type', 'userId', 'label', 'notes', 'createdAt', 'updatedAt',
            'canonicalSmiles', 'molFormula', 'name', 'propertiesJson', 'chemblMolregno'
        ];

        const wants = (map: any, path: string[]) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            let cur = map;
            for (const p of path) {
                if (!cur || typeof cur !== 'object') return false;
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                cur = cur[p];
            }
            return cur !== undefined;
        };

        const requestedItemCols = Object.keys(fieldsMap ?? {}).filter(k => DB_FIELDS.includes(k));
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
                qb = qb.leftJoin('j.collection', 'c');

                const COL_ALLOWED = ['id', 'name', 'createdAt', 'updatedAt'];
                const colFieldsMap =
                    ((fieldsMap?.joins as GraphQLFieldsMap | undefined)?.collection as GraphQLFieldsMap | undefined) ?? {};

                const colCols = COL_ALLOWED.filter(k => (colFieldsMap as any)[k] !== undefined);
                if (colCols.length) {
                    qb = qb.addSelect(colCols.map(cn => `c.${cn}`));
                }

                // itemsCount
                if (wants(fieldsMap, ['joins', 'collection', 'itemsCount'])) {
                    qb = qb.loadRelationCountAndMap('c.itemsCount', 'c.items');
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

        return qb.getOne();
    }

    async findOneDTO(
        userId: UUID,
        itemId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<CustomMoleculeItemDTO | ChEMBLMoleculeItemDTO | null> {
        // Delego al metodo già esistente
        const item = await this.findOne(userId, itemId, fieldsMap);
        if (!item) {
            return null
        }

        // Preparo la mappa dettagli solo se è un item ChEMBL
        const detailsMap: Record<string, MoleculeDetail> = {};
        if (item.type === 'chembl') {
            const chemblMolregno = String((item as ChEMBLMoleculeItemEntity).chemblMolregno);
            const detailsArr = await this.moleculeService.getDetailsByMolregnos([chemblMolregno]);
            const details = detailsArr?.[0];
            if (details) {
                detailsMap[chemblMolregno] = details;
            }
        }

        // Applico la trasformazione polimorfica centralizzata
        return this.toPolymorphicDto(item, detailsMap);
    }





    async findAllByUser(userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollectionItemEntity[]> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, ['id', 'type'])
        let qb = this.itemRepo.createQueryBuilder('item')
            .select(columns.map(col => `item.${col}`))
            .where('item.user_id = :userId', { userId })
        qb = TypeOrmUtils.addJoins(qb, 'item', fieldsMap)
        return qb.getMany()
    }

    private toPolymorphicDto(
        item: MoleculeCollectionItemEntity,
        detailsMap: Record<string, MoleculeDetail>
    ): CustomMoleculeItemDTO | ChEMBLMoleculeItemDTO {
        if (item.type === 'custom') {
            const e = item as CustomMoleculeItemEntity;
            return {
                id: e.id,
                userId: e.userId,
                label: e.label,
                notes: e.notes,
                type: e.type,
                canonicalSmiles: e.canonicalSmiles,
                molFormula: e.molFormula,
                name: e.name,
                propertiesJson: e.propertiesJson,
                createdAt: e.createdAt,
                updatedAt: e.updatedAt,
                joins: e.joins
            } as CustomMoleculeItemDTO;
        }

        if (item.type === 'chembl') {
            const e = item as ChEMBLMoleculeItemEntity;
            const chemblMolregno = String(e.chemblMolregno);
            return {
                id: e.id,
                label: e.label,
                notes: e.notes,
                type: e.type,
                chemblMolregno,
                chemblDetails: detailsMap[chemblMolregno] ?? null,
                createdAt: e.createdAt,
                updatedAt: e.updatedAt,
                joins: e.joins
            } as unknown as ChEMBLMoleculeItemDTO;
        }

        throw new RpcException(`UnknownItemType::${(item as any).type}`);
    }

    async paginateAllByUser(
        userId: UUID,
        options: IPaginationOptions,
        fieldsMap: GraphQLFieldsMap,
    ): Promise<PaginatedMoleculeCollectionItem> {
        // Solo campi DB reali!
        const DB_FIELDS = [
            'id', 'type', 'userId', 'label', 'notes', 'createdAt', 'updatedAt',
            'canonicalSmiles', 'molFormula', 'name', 'propertiesJson',
            'chemblMolregno'
        ];

        // Prendi solo quelli richiesti e realmente esistenti nel DB
        const itemsFields = fieldsMap?.items
            ? Object.keys(fieldsMap.items).filter(k => DB_FIELDS.includes(k))
            : DB_FIELDS;

        // Query builder
        const qb = this.itemRepo.createQueryBuilder('item')
            .select(itemsFields.map(col => `item.${col}`))
            .where('item.user_id = :userId', { userId })
            .orderBy('item.createdAt', 'DESC');

        // Niente join su campi virtuali!
        const page = await paginate<MoleculeCollectionItemEntity>(qb, options);

        // Batch ChEMBL
        const chemblItems = page.items.filter(i => i.type === 'chembl') as ChEMBLMoleculeItemEntity[];
        let detailsMap: Record<string, MoleculeDetail> = {};
        if (chemblItems.length > 0) {
            const molregnos = chemblItems.map(i => String(i.chemblMolregno));
            const detailsArray = await this.moleculeService.getDetailsByMolregnos(molregnos);
            detailsMap = Object.fromEntries(detailsArray.map(d => [String(d.id), d]));
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
        fieldsMap: GraphQLFieldsMap,
    ): Promise<PaginatedMoleculeCollectionItem> {
        // Solo campi DB reali!
        const DB_FIELDS = [
            'id', 'type', 'userId', 'label', 'notes', 'createdAt', 'updatedAt',
            'canonicalSmiles', 'molFormula', 'name', 'propertiesJson',
            'chemblMolregno'
        ];

        const itemsFields = fieldsMap?.items
            ? Object.keys(fieldsMap.items).filter(k => DB_FIELDS.includes(k))
            : DB_FIELDS;

        // Query builder: join su collection join table
        const qb = this.itemRepo.createQueryBuilder('item')
            .innerJoin(
                'item.joins',
                'join',
                'join.collectionId = :collectionId AND join.userId = :userId',
                { collectionId, userId }
            )
            .select(itemsFields.map(col => `item.${col}`))
            .orderBy('item.createdAt', 'DESC');

        // Niente join su campi virtuali!
        const page = await paginate<MoleculeCollectionItemEntity>(qb, options);

        // Batch ChEMBL
        const chemblItems = page.items.filter(i => i.type === 'chembl') as ChEMBLMoleculeItemEntity[];
        let detailsMap: Record<string, MoleculeDetail> = {};
        if (chemblItems.length > 0) {
            const molregnos = chemblItems.map(i => String(i.chemblMolregno));
            const detailsArray = await this.moleculeService.getDetailsByMolregnos(molregnos);
            detailsMap = Object.fromEntries(detailsArray.map(d => [String(d.id), d]));
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






    async update(id: UUID, userId: UUID, input: Partial<MoleculeCollectionItemEntity>, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollectionItemEntity | null> {
        await this.itemRepo.update({ id, userId }, { ...input })
        return this.findOne(id, userId, fieldsMap)
    }

    async delete(id: UUID, userId: UUID): Promise<boolean> {
        try {
            await this.itemRepo.delete({ id, userId })
            return true
        } catch {
            return false
        }
    }
}
