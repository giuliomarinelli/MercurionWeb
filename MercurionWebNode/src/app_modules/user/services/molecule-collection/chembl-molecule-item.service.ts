import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ChEMBLMoleculeItemEntity } from "../../Models/entities/molecule-collection/chembl-molecule-item.entity";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { GraphQLFieldsMap } from "src/type-orm-utils/type-orm-utils";
import { GraphqlUtils } from "src/graphql-utils/graphql-utils";
import { MoleculeCollectionItemJoinService } from "./molecule-collection-item-join.service";
import { RpcException } from "@nestjs/microservices";
import { MoleculeCollection } from "../../Models/entities/molecule-collection/molecule-collection.entity";
import { uuidv7 } from '@kripod/uuidv7';

@Injectable()
export class ChEMBLMoleculeItemService {

    constructor(
        @InjectRepository(ChEMBLMoleculeItemEntity)
        private readonly chemblRepo: Repository<ChEMBLMoleculeItemEntity>,
        @InjectRepository(MoleculeCollection)
        private readonly collectionRepo: Repository<MoleculeCollection>,
        private readonly joinService: MoleculeCollectionItemJoinService
    ) { }

    async addToCollection(
        userId: UUID,
        collectionId: UUID,
        chemblMolregno: number,
        label?: string,
        notes?: string
    ): Promise<ChEMBLMoleculeItemEntity> {

        // Trova o crea l'item ChEMBL
        let item = await this.chemblRepo.findOne({ where: { chemblMolregno, userId } })
        if (!item) {
            item = this.chemblRepo.create({ id: uuidv7() as UUID, chemblMolregno, userId, label, notes })
            item.type = 'chembl'
            item = await this.chemblRepo.save(item)
        }

        // TROVA LA COLLEZIONE e verifica ownership!
        const collection = await this.collectionRepo.findOne({ where: { id: collectionId, userId } })
        if (!collection) throw new RpcException("ChEMBLItemAddError::Forbidden")

        await this.joinService.add(userId, collectionId, item.id)
        return item
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
