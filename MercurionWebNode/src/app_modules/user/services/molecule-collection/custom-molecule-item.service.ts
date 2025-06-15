import { MoleculeCollectionItemJoinService } from './molecule-collection-item-join.service';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomMoleculeItemEntity } from "../../Models/entities/molecule-collection/custom-molecule-item.entity";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { GraphQLFieldsMap } from "src/type-orm-utils/type-orm-utils";
import { GraphqlUtils } from "src/graphql-utils/graphql-utils";
import { CustomMoleculeItemInput } from "../../Models/DTO/molecule-collection/custom-molecule-item.input";
import { MoleculeCollection } from '../../Models/entities/molecule-collection/molecule-collection.entity';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class CustomMoleculeItemService {

    private readonly REQUIRED_FIELD = ['id', 'canonicalSmiles', 'userId']

    constructor(
        @InjectRepository(CustomMoleculeItemEntity)
        private readonly customRepo: Repository<CustomMoleculeItemEntity>,
        @InjectRepository(MoleculeCollection)
        private readonly collectionRepo: Repository<MoleculeCollection>,
        private readonly joinService: MoleculeCollectionItemJoinService
    ) { }

    async addToCollection(userId: UUID, collectionId: UUID, input: CustomMoleculeItemInput): Promise<CustomMoleculeItemEntity> {
        let item = await this.customRepo.findOne({ where: { canonicalSmiles: input.canonicalSmiles, userId } })
        if (!item) {
            item = this.customRepo.create({ ...input, userId })
            item = await this.customRepo.save(item)
        }

        // Ownership check della collection!
        const collection = await this.collectionRepo.findOne({ where: { id: collectionId, userId } })
        if (!collection) throw new RpcException("CustomItemAddError::Forbidden")

        await this.joinService.add(userId, collectionId, item.id)
        return item
    }



    async update(userId: UUID, id: UUID, input: CustomMoleculeItemInput, fieldsMap: GraphQLFieldsMap): Promise<CustomMoleculeItemEntity | null> {
        await this.customRepo.update({ id, userId }, { ...input })
        return this.findOneById(id, userId, fieldsMap)
    }

    async removeFromCollection(userId: UUID, collectionId: UUID, itemId: UUID): Promise<boolean> {
        return this.joinService.remove(userId, collectionId, itemId)
    }


    async findByCollection(
        collectionId: UUID, userId: UUID, fieldsMap: GraphQLFieldsMap
    ): Promise<CustomMoleculeItemEntity[]> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELD)
        const qb = this.customRepo.createQueryBuilder('item')
            .select(columns.map(col => `item.${col}`))
            .innerJoin('item.joins', 'join')
            .where('join.collection = :collectionId', { collectionId })
            .andWhere('item.user_id = :userId', { userId })
        return qb.getMany()
    }

    async findOneById(
        itemId: UUID, userId: UUID, fieldsMap: GraphQLFieldsMap
    ): Promise<CustomMoleculeItemEntity | null> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELD)
        const qb = this.customRepo.createQueryBuilder('item')
            .select(columns.map(col => `item.${col}`))
            .where('item.id = :itemId', { itemId })
            .andWhere('item.user_id = :userId', { userId })
        return qb.getOne()
    }
}
