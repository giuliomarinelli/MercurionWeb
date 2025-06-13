import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomMoleculeItemEntity } from "../../Models/entities/molecule-collection/custom-molecule-item.entity";
import { Repository } from "typeorm";
import { MoleculeCollectionItemJoin } from "../../Models/entities/molecule-collection/molecule-collection-item-join.entity";
import { UUID } from "crypto";
import { GraphQLFieldsMap } from "src/type-orm-utils/type-orm-utils";
import { GraphqlUtils } from "src/graphql-utils/graphql-utils";
import { CustomMoleculeItemInput } from "../../Models/DTO/molecule-collection/custom-molecule-item.input";

@Injectable()
export class CustomMoleculeItemService {

    constructor(
        @InjectRepository(CustomMoleculeItemEntity)
        private readonly customRepo: Repository<CustomMoleculeItemEntity>,
        @InjectRepository(MoleculeCollectionItemJoin)
        private readonly joinRepo: Repository<MoleculeCollectionItemJoin>
    ) { }

    async addToCollection(userId: UUID, collectionId: UUID, input: CustomMoleculeItemInput): Promise<CustomMoleculeItemEntity> {
        let item = await this.customRepo.findOne({ where: { canonicalSmiles: input.canonicalSmiles, userId } })
        if (!item) {
            item = this.customRepo.create({ ...input, userId })
            item = await this.customRepo.save(item)
        }
        // Join
        let join = await this.joinRepo.findOne({
            where: { collection: { id: collectionId }, item: { id: item.id } }
        })
        if (!join) {
            join = this.joinRepo.create({ collection: { id: collectionId }, item })
            await this.joinRepo.save(join)
        }
        return item
    }

    async update(userId: UUID, id: UUID, input: CustomMoleculeItemInput, fieldsMap: GraphQLFieldsMap): Promise<CustomMoleculeItemEntity | null> {
        await this.customRepo.update({ id, userId }, { ...input })
        return this.findOneById(id, userId, fieldsMap)
    }

    async removeFromCollection(userId: UUID, collectionId: UUID, itemId: UUID): Promise<boolean> {
        await this.joinRepo.delete({
            collection: { id: collectionId, userId },
            item: { id: itemId, userId }
        });
        return true
    }

    async findByCollection(
        collectionId: UUID, userId: UUID, fieldsMap: GraphQLFieldsMap
    ): Promise<CustomMoleculeItemEntity[]> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, ['id', 'canonicalSmiles', 'userId'])
        const qb = this.customRepo.createQueryBuilder('item')
            .select(columns.map(col => `item.${col}`))
            .innerJoin('item.joins', 'join')
            .where('join.collection = :collectionId', { collectionId })
            .andWhere('item.userId = :userId', { userId })
        return qb.getMany()
    }

    async findOneById(
        itemId: UUID, userId: UUID, fieldsMap: GraphQLFieldsMap
    ): Promise<CustomMoleculeItemEntity | null> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, ['id', 'canonicalSmiles', 'userId'])
        const qb = this.customRepo.createQueryBuilder('item')
            .select(columns.map(col => `item.${col}`))
            .where('item.id = :itemId', { itemId })
            .andWhere('item.userId = :userId', { userId })
        return qb.getOne()
    }
}
