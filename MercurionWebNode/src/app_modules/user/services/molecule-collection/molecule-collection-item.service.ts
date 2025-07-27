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

    async findOne(id: UUID, userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollectionItemEntity | null> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, ['id', 'type'])
        let qb = this.itemRepo.createQueryBuilder('item')
            .select(columns.map(col => `item.${col}`))
            .where('item.id = :id', { id })
            .andWhere('item.user_id = :userId', { userId })
        qb = TypeOrmUtils.addJoins(qb, 'item', fieldsMap)
        return qb.getOne()
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

    async paginateAllByUser(
        userId: UUID,
        options: IPaginationOptions,
        fieldsMap: GraphQLFieldsMap,
    ): Promise<PaginatedMoleculeCollectionItem> {

        // 1️⃣ Rimuovi eventuali chiavi DTO che NON sono relazioni DB
        for (const k of ['items', 'meta', 'links']) {
            if (k in fieldsMap) delete fieldsMap[k];
        }

        // 2️⃣ Escludi tutti i campi che NON sono colonne vere della tabella
        const EXCLUDED_FIELDS = [
            'itemCount', 'totalItems', 'itemsPerPage',
            'totalPages', 'currentPage', 'meta', 'links'
        ];

        // 3️⃣ Prepara la lista completa dei campi effettivi di tutte le entità polimorfe
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap);
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, [
            'id', 'type', 'userId', 'label', 'notes', 'createdAt', 'updatedAt',
            'canonicalSmiles', 'molFormula', 'name', 'propertiesJson', // custom
            'chemblMolregno' // chembl
        ]).filter(col => !EXCLUDED_FIELDS.includes(col));

        // 4️⃣ Query Builder base
        let qb = this.itemRepo.createQueryBuilder('item')
            .select(columns.map(col => `item.${col}`))
            .where('item.user_id = :userId', { userId })
            .orderBy('item.createdAt', 'DESC');

        qb = TypeOrmUtils.addJoins(qb, 'item', fieldsMap);

        // 5️⃣ Paginazione
        const page = await paginate<MoleculeCollectionItemEntity>(qb, options);

        // 6️⃣ Prepara la batch per ChEMBL
        const chemblItems = page.items.filter(item => item.type === 'chembl');
        let detailsMap: Record<string, MoleculeDetail> = {};
        if (chemblItems.length > 0) {
            // Qui, attenzione: chemblMolregno è la chiave che corrisponde all'id su Meilisearch
            const molregnos = chemblItems.map(item => String((item as ChEMBLMoleculeItemEntity).chemblMolregno));
            const detailsArray = await this.moleculeService.getDetailsByMolregnos(molregnos);
            detailsMap = Object.fromEntries(detailsArray.map(d => [String(d.id), d]));
        }

        // 7️⃣ Mapping finale ai DTO polimorfici
        const items: Array<CustomMoleculeItemDTO | ChEMBLMoleculeItemDTO> = page.items.map(item => {
            if (item.type === 'custom') {
                return {
                    id: item.id,
                    userId: item.userId,
                    label: item.label,
                    notes: item.notes,
                    type: item.type,
                    canonicalSmiles: (item as CustomMoleculeItemEntity).canonicalSmiles,
                    molFormula: (item as CustomMoleculeItemEntity).molFormula,
                    name: (item as CustomMoleculeItemEntity).name,
                    propertiesJson: (item as CustomMoleculeItemEntity).propertiesJson,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                } as CustomMoleculeItemDTO;
            }
            if (item.type === 'chembl') {
                const chemblMolregno = String((item as ChEMBLMoleculeItemEntity).chemblMolregno);
                return {
                    id: item.id,
                    label: item.label,
                    notes: item.notes,
                    type: item.type,
                    chemblMolregno,
                    chemblDetails: detailsMap[chemblMolregno] || null,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                } as unknown as ChEMBLMoleculeItemDTO;
            }
            throw new RpcException(`UnknownItemType::${item.type}`);
        });

        // 8️⃣ Risposta paginata finale
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

        // Escludi chiavi DTO/meta non relazionali
        for (const k of ['items', 'meta', 'links']) {
            if (k in fieldsMap) delete fieldsMap[k];
        }

        const EXCLUDED_FIELDS = [
            'itemCount', 'totalItems', 'itemsPerPage', 'totalPages', 'currentPage', 'meta', 'links'
        ];

        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap);
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, [
            'id', 'type', 'userId', 'label', 'notes', 'createdAt', 'updatedAt',
            'canonicalSmiles', 'molFormula', 'name', 'propertiesJson', // custom
            'chemblMolregno' // chembl
        ]).filter(col => !EXCLUDED_FIELDS.includes(col));

        // Query builder: join tra la join table e gli items veri e propri
        let qb = this.itemRepo.createQueryBuilder('item')
            .innerJoin('item.joins', 'join', 'join.collectionId = :collectionId AND join.userId = :userId', { collectionId, userId })
            .select(columns.map(col => `item.${col}`))
            .orderBy('item.createdAt', 'DESC');

        qb = TypeOrmUtils.addJoins(qb, 'item', fieldsMap);

        const page = await paginate<MoleculeCollectionItemEntity>(qb, options);

        // Batch dettagli chembl
        const chemblItems = page.items.filter(item => item.type === 'chembl');
        let detailsMap: Record<string, MoleculeDetail> = {};
        if (chemblItems.length > 0) {
            const molregnos = chemblItems.map(item => String((item as ChEMBLMoleculeItemEntity).chemblMolregno));
            const detailsArray = await this.moleculeService.getDetailsByMolregnos(molregnos);
            detailsMap = Object.fromEntries(detailsArray.map(d => [String(d.id), d]));
        }

        // Mapping finale
        const items: Array<CustomMoleculeItemDTO | ChEMBLMoleculeItemDTO> = page.items.map(item => {
            if (item.type === 'custom') {
                return {
                    id: item.id,
                    userId: item.userId,
                    label: item.label,
                    notes: item.notes,
                    type: item.type,
                    canonicalSmiles: (item as CustomMoleculeItemEntity).canonicalSmiles,
                    molFormula: (item as CustomMoleculeItemEntity).molFormula,
                    name: (item as CustomMoleculeItemEntity).name,
                    propertiesJson: (item as CustomMoleculeItemEntity).propertiesJson,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                } as CustomMoleculeItemDTO;
            }
            if (item.type === 'chembl') {
                const chemblMolregno = String((item as ChEMBLMoleculeItemEntity).chemblMolregno);
                return {
                    id: item.id,
                    label: item.label,
                    notes: item.notes,
                    type: item.type,
                    chemblMolregno,
                    chemblDetails: detailsMap[chemblMolregno] || null,
                    createdAt: item.createdAt,
                    updatedAt: item.updatedAt,
                } as unknown as ChEMBLMoleculeItemDTO;
            }
            throw new RpcException(`UnknownItemType::${item.type}`);
        });

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
