import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ChEMBLMoleculeItemEntity } from "../../Models/entities/molecule-collection/chembl-molecule-item.entity";
import { FindOptionsWhere, Repository } from "typeorm";
import { MoleculeCollectionItemJoin } from "../../Models/entities/molecule-collection/molecule-collection-item-join.entity";
import { UUID } from "crypto";
import { MoleculeCollection } from "../../Models/entities/molecule-collection/molecule-collection.entity";
import { GraphQLFieldsMap } from "src/type-orm-utils/type-orm-utils";
import { GraphqlUtils } from "src/graphql-utils/graphql-utils";


@Injectable()
export class ChEMBLMoleculeItemService {

    constructor(
        @InjectRepository(ChEMBLMoleculeItemEntity)
        private readonly chemblRepo: Repository<ChEMBLMoleculeItemEntity>,
        @InjectRepository(MoleculeCollectionItemJoin)
        private readonly joinRepo: Repository<MoleculeCollectionItemJoin>
    ) { }

    async addToCollection(userId: UUID, collectionId: UUID, chemblMolregno: number, label?: string, notes?: string): Promise<ChEMBLMoleculeItemEntity> {
        let item = await this.chemblRepo.findOne({ where: { chemblMolregno, userId } })
        // TODO: transaction per verificare che userId di molecule e collection siano uguali
        if (!item) {
            item = this.chemblRepo.create({ chemblMolregno, userId, label, notes });
            item = await this.chemblRepo.save(item)
        }

        let join = await this.joinRepo.findOne({ where: { collection: { id: collectionId }, item: { id: item.id } } })
        if (!join) {
            join = this.joinRepo.create({ collection: { id: collectionId } as MoleculeCollection, item })
            await this.joinRepo.save(join);
        }
        return item;
    }

    async removeFromCollection(userId: UUID, collectionId: UUID, itemId: UUID): Promise<boolean> {
        // TODO: implementare richiamo della relazione per evitare che ci sia undefined nei campi innestati
        await this.joinRepo.delete({
            collection: { id: collectionId, userId },
            item: { id: itemId, userId },
        }) as FindOptionsWhere<MoleculeCollectionItemJoin>
        return true
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
