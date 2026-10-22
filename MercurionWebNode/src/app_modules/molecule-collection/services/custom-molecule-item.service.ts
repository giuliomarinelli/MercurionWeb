import { MoleculeCollectionItemJoinService } from './molecule-collection-item-join.service';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomMoleculeItemEntity } from "../models/entities/custom-molecule-item.entity";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { CustomMoleculeItemInput } from "../models/dto/custom-molecule-item.input";

import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/utils/type-orm-utils/type-orm-utils';
import { runInTransaction } from 'src/persistence/transaction-context'
import { MoleculeOwnershipPolicy } from './molecule-ownership.policy'
import { CustomMoleculeResolutionService } from './custom-molecule-resolution.service'

@Injectable()
export class CustomMoleculeItemService {

    private readonly REQUIRED_FIELD = ['id', 'canonicalSmiles', 'userId']

    constructor(
        @InjectRepository(CustomMoleculeItemEntity)
        private readonly customRepo: Repository<CustomMoleculeItemEntity>,
        private readonly joinService: MoleculeCollectionItemJoinService,
        private readonly resolutionService: CustomMoleculeResolutionService,
        private readonly ownershipPolicy: MoleculeOwnershipPolicy
    ) { }

    async addToCollection(
        userId: UUID,
        collectionId: UUID,
        input: CustomMoleculeItemInput,
        accessToken: string
    ): Promise<CustomMoleculeItemEntity> {
        // Canonicalize outside the transaction; RDKit is an external service.
        const canonical = await this.resolutionService.canonicalize(
            input.canonicalSmiles,
            accessToken
        )

        return runInTransaction(this.customRepo.manager, async (_context, manager) => {
            // Do not create an otherwise orphaned molecule for an inaccessible collection.
            await this.ownershipPolicy.assertCollectionOwned(manager, userId, collectionId)
            const item = await this.resolutionService.resolveCanonicalWithManager(
                userId, canonical, input, manager
            )
            await this.joinService.addMoleculeToCollectionWithManager(
                userId, collectionId, item.id, manager
            )
            return item
        })
    }

    async removeFromCollection(userId: UUID, collectionId: UUID, itemId: UUID): Promise<boolean> {
        return this.joinService.removeMoleculeFromCollection(userId, collectionId, itemId)
    }

    async findOneByCanonicalSmiles(userId: UUID, cs: string, fieldsMap: GraphQLFieldsMap): Promise<CustomMoleculeItemEntity | null> {
        const scalarFields = GraphQLUtils.getScalarFields(fieldsMap)
        const columns = GraphQLUtils.ensureRequiredFields(scalarFields, ['id', 'type', 'canonicalSmiles'])
        let qb = this.customRepo.createQueryBuilder('m')
            .select(columns.map((col) => `m.${col}`))
            .where('m.userId = :userId', { userId })
            .andWhere('m.canonicalSmiles = :cs', { cs })

        qb = TypeOrmUtils.addJoins(qb, 'm', fieldsMap)
        const a = await qb.getOne()
        return a
    }

    async getPreferredNameItByCanonicalSmiles(userId: UUID, cs: string): Promise<string | null> {
        const item = await this.customRepo.findOne({
            where: { userId, canonicalSmiles: cs },
            select: ['name']
        })
        return item?.name ?? null
    }

}
