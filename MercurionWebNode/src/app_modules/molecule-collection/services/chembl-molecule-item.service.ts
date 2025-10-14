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

@Injectable()
export class ChEMBLMoleculeItemService {

    constructor(
        @InjectRepository(ChEMBLMoleculeItemEntity)
        private readonly chemblRepo: Repository<ChEMBLMoleculeItemEntity>,
        private readonly joinService: MoleculeCollectionItemJoinService,
        private readonly dataSource: DataSource
    ) { }

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



        // return this.chemblRepo.exists({
        //     where: {
        //         chemblMolregno: molregno,
        //         userId,
        //         type: 'chembl'
        //     }
        // })
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
