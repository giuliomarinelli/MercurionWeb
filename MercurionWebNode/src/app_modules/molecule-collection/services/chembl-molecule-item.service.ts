import { MoleculeCollectionItemJoin } from './../Models/entities/molecule-collection-item-join.entity';
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

    async getChemblMolregnosByCollectionId(userId: UUID, collectionId: UUID): Promise<number[]> {
        const joinRows = await this.dataSource.createQueryBuilder(MoleculeCollectionItemJoin, 'j')
            .select(['j.itemId'])
            .where('j.userId = :userId', { userId })
            .andWhere('j.collectionId = :collectionId', { collectionId })
            .getMany()
        const itemIds = joinRows.map(r => r.itemId)
        const _where = itemIds.map(itemId => {
            const itemClause: Pick<ChEMBLMoleculeItemEntity, 'id' | 'userId' | 'type'> = {
                userId,
                id: itemId,
                type: 'chembl'
            }
            return itemClause
        })
        const itemRows = await this.chemblRepo.find({
            where: _where,
            select: {
                chemblMolregno: true
            }
        })
        return itemRows.map(r => r.chemblMolregno)

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
        try {
            return await this.dataSource.manager.transaction(async manager => {
                const molregnoMap = new Map<number, AddManyChEMBLItemDTO>()
                for (const dto of dtos) {
                    if (!molregnoMap.has(dto.chemblMolregno)) {
                        molregnoMap.set(dto.chemblMolregno, dto)
                    }
                }

                if (molregnoMap.size === 0) {
                    return true
                }

                const requestedMolregnos = Array.from(molregnoMap.keys())

                const joinRows = await manager.createQueryBuilder(MoleculeCollectionItemJoin, 'j')
                    .select(['j.itemId'])
                    .where('j.userId = :userId', { userId })
                    .andWhere('j.collectionId = :collectionId', { collectionId })
                    .getMany()
                const alreadyJoinedItemIds = new Set(joinRows.map(r => r.itemId))

                const existingItems = await manager.find(ChEMBLMoleculeItemEntity, {
                    where: requestedMolregnos.map(molregno => ({
                        userId,
                        chemblMolregno: molregno,
                        type: 'chembl'
                    })),
                    select: {
                        id: true,
                        chemblMolregno: true
                    }
                })

                const existingMolregnoToId = new Map(existingItems.map(item => [item.chemblMolregno, item.id] as const))

                const newEntities: ChEMBLMoleculeItemEntity[] = []
                for (const molregno of requestedMolregnos) {
                    if (existingMolregnoToId.has(molregno)) {
                        continue
                    }
                    const dto = molregnoMap.get(molregno)
                    if (!dto) {
                        continue
                    }
                    const now = Date.now()
                    newEntities.push(manager.create(ChEMBLMoleculeItemEntity, {
                        id: uuidv7() as UUID,
                        userId,
                        type: 'chembl',
                        createdAt: now,
                        updatedAt: now,
                        touchedAt: now,
                        chemblMolregno: molregno,
                        name: dto.name
                    }))
                }

                const createdItems = newEntities.length > 0
                    ? await manager.save(ChEMBLMoleculeItemEntity, newEntities)
                    : []

                const itemsToJoin: UUID[] = []

                for (const created of createdItems) {
                    itemsToJoin.push(created.id)
                }

                for (const existing of existingItems) {
                    if (!alreadyJoinedItemIds.has(existing.id)) {
                        itemsToJoin.push(existing.id)
                    }
                }

                if (itemsToJoin.length > 0) {
                    await this.joinService.addManyWithManager(userId, collectionId, itemsToJoin, false, manager)
                }

                return true
            })
        } catch {
            return false
        }
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
