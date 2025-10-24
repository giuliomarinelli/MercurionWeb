import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ChEMBLMoleculeItemEntity } from "../Models/entities/chembl-molecule-item.entity";
import { DataSource, Repository } from "typeorm";
import { UUID } from "crypto";
import { GraphQLFieldsMap } from "src/utils/type-orm-utils/type-orm-utils";
import { GraphqlUtils } from "src/utils/graphql-utils/graphql-utils";
import { MoleculeCollectionItemJoinService } from "./molecule-collection-item-join.service";
import { RpcException } from "@nestjs/microservices";
import { MoleculeCollection } from "../Models/entities/molecule-collection.entity";
import { uuidv7 } from '@kripod/uuidv7';
import { GeneralUtils } from "src/utils/general-utils/general-utils";
import { AddManyChEMBLItemDTO } from "../Models/DTO/add-many-chembl-items.dto";

@Injectable()
export class ChEMBLMoleculeItemService {

    constructor(
        @InjectRepository(ChEMBLMoleculeItemEntity)
        private readonly chemblRepo: Repository<ChEMBLMoleculeItemEntity>,
        private readonly joinService: MoleculeCollectionItemJoinService,
        private readonly dataSource: DataSource
    ) { }

    async getChemblMolregnosByUserId(userId: UUID): Promise<number[]> {
        const rows = await this.chemblRepo.find({
            where: {
                userId, type: 'chembl'
            },
            select: {
                chemblMolregno: true
            }
        })
        return rows.map(r => r.chemblMolregno)
    }

    async hasUserChEMBLMoleculeByMolregnoThenGetUUID(userId: UUID, molregno: number): Promise<string | null> {
        const row = await this.chemblRepo.createQueryBuilder('m')
            .select(['m.id'])
            .where('m.chemblMolregno = :molregno', { molregno })
            .andWhere('m.userId = :userId', { userId })
            .andWhere(`m.type = 'chembl'`)
            .getOne()
        if (!row) {
            return null
        }
        return row.id
    }

    async existsChEMBLMoleculeByUUIDThenGetMolregno(_uuid_: UUID): Promise<string | null> {
        const row = await this.chemblRepo.createQueryBuilder('m')
            .select(['m.chemblMolregno'])
            .where('m.id = :_uuid_', { _uuid_ })
            .andWhere(`m.type = 'chembl'`)
            .getOne()
        if (!row) {
            return null
        }
        return row.chemblMolregno.toString()
    }

    async addToCollection(
        userId: UUID,
        collectionId: UUID,
        chemblMolregno: number,
        label?: string,
        notes?: string
    ): Promise<ChEMBLMoleculeItemEntity> {
        return await this.dataSource.transaction(async (manager) => {

            let item = await manager.findOne(ChEMBLMoleculeItemEntity, { where: { chemblMolregno, userId } })
            if (!item) {
                item = manager.create(ChEMBLMoleculeItemEntity, {
                    id: uuidv7() as UUID,
                    chemblMolregno,
                    userId,
                    label,
                    notes,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    type: 'chembl'
                })
                item = await manager.save(ChEMBLMoleculeItemEntity, item)
            }

            // 2. Trova la collection (usa il manager)
            const collection = await manager.findOne(MoleculeCollection, { where: { id: collectionId, userId } });
            if (!collection) throw new RpcException("ChEMBLItemAddError::Forbidden");

            // 3. Crea la join (se il joinService usa repository, passagli manager.queryRunner.manager oppure implementa la logica qui)
            await this.joinService.addWithManager(userId, collectionId, item.id, manager);

            // 4. Aggiorna updatedAt della collection
            await manager.update(MoleculeCollection, { id: collectionId, userId }, { updatedAt: Date.now() });

            return item;
        });
    }


    async removeFromCollection(userId: UUID, collectionId: UUID, itemId: UUID): Promise<boolean> {
        return this.joinService.remove(userId, collectionId, itemId)
    }

    // TODO: implementation => if exists it fetches ChEMBLMoleculeItem and adds to collection without creating
    async addManyChemblItemsToCollection(
        userId: UUID,
        collectionId: UUID,
        dtos: AddManyChEMBLItemDTO[]
    ): Promise<boolean> {
        return await this.dataSource.manager.transaction(async manager => {
            try {
                const molregnosRows = await manager.find(ChEMBLMoleculeItemEntity, {
                    where: {
                        userId, type: 'chembl'
                    },
                    select: {
                        chemblMolregno: true
                    }
                })
                const alreadyPresentMolregnos = molregnosRows.map(chMol => chMol.chemblMolregno)
                const clearedDTOs = GeneralUtils.distinctArray(dtos.filter(dto => !alreadyPresentMolregnos.includes(dto.chemblMolregno)))
                const entities: ChEMBLMoleculeItemEntity[] = []
                for (const { chemblMolregno, name } of clearedDTOs) {
                    const now = Date.now()
                    const entity = manager.create(ChEMBLMoleculeItemEntity, {
                        id: uuidv7() as UUID,
                        userId,
                        type: 'chembl',
                        createdAt: now,
                        updatedAt: now,
                        touchedAt: now,
                        chemblMolregno,
                        name
                    })
                    entities.push(entity)
                }
                const itemIds = (await manager.save(ChEMBLMoleculeItemEntity, entities))
                    .map(item => item.id)
                await this.joinService.addManyWithManager(userId, collectionId, itemIds, false, manager)
                return true
            } catch {
                return false
            }
        })
    }

    async findByCollection(
        collectionId: UUID,
        userId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<ChEMBLMoleculeItemEntity[]> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, ['id', 'chemblMolregno', 'userId'])

        const qb = this.chemblRepo.createQueryBuilder('item')
            .select(columns.map(col => `item.${col}`))
            .innerJoin('item.joins', 'join')
            .where('join.collection = :collection_id', { collectionId })
            .andWhere('item.userId = :user_id', { userId })

        return qb.getMany()
    }

    async findOneById(
        itemId: UUID,
        userId: UUID,
        fieldsMap: GraphQLFieldsMap
    ): Promise<ChEMBLMoleculeItemEntity | null> {

        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, ['id', 'chemblMolregno', 'userId'])

        const qb = this.chemblRepo.createQueryBuilder('item')
            .select(columns.map(col => `item.${col}`))
            .where('item.id = :item_id', { itemId })
            .andWhere('item.userId = :user_id', { userId })

        return qb.getOne()
    }
}
