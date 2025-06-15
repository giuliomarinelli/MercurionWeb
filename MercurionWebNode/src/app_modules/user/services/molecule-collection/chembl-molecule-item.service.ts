import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ChEMBLMoleculeItemEntity } from "../../Models/entities/molecule-collection/chembl-molecule-item.entity";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { GraphQLFieldsMap } from "src/type-orm-utils/type-orm-utils";
import { GraphqlUtils } from "src/graphql-utils/graphql-utils";
import { MoleculeCollectionItemJoinService } from "./molecule-collection-item-join.service";


@Injectable()
export class ChEMBLMoleculeItemService {

    constructor(
        @InjectRepository(ChEMBLMoleculeItemEntity)
        private readonly chemblRepo: Repository<ChEMBLMoleculeItemEntity>,
        private readonly joinService: MoleculeCollectionItemJoinService
    ) { }

    async addToCollection(userId: UUID, collectionId: UUID, chemblMolregno: number, label?: string, notes?: string): Promise<ChEMBLMoleculeItemEntity> {
        let item = await this.chemblRepo.findOne({ where: { chemblMolregno, userId } })
        if (!item) {
            item = this.chemblRepo.create({ chemblMolregno, userId, label, notes });
            item = await this.chemblRepo.save(item)
        }
        // Chiamata DRY alla join centralizzata!
        await this.joinService.add(userId, collectionId, item.id)
        return item;
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
            .where('join.collection = :collectionId', { collectionId })
            .andWhere('item.userId = :userId', { userId })

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
            .where('item.id = :itemId', { itemId })
            .andWhere('item.userId = :userId', { userId })

        return qb.getOne()
    }
}
