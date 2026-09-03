import { MoleculeCollectionItemJoinService } from './molecule-collection-item-join.service';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomMoleculeItemEntity } from "../Models/entities/custom-molecule-item.entity";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { CustomMoleculeItemInput } from "../Models/DTO/custom-molecule-item.input";
import { MoleculeCollection } from '../Models/entities/molecule-collection.entity';

import { uuidv7 } from '@kripod/uuidv7';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/utils/type-orm-utils/type-orm-utils';
import { RDKitService } from 'src/app_modules/mercurion-ai/services/rd-kit.service';
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

@Injectable()
export class CustomMoleculeItemService {

    private readonly REQUIRED_FIELD = ['id', 'canonicalSmiles', 'userId']

    constructor(
        @InjectRepository(CustomMoleculeItemEntity)
        private readonly customRepo: Repository<CustomMoleculeItemEntity>,
        @InjectRepository(MoleculeCollection)
        private readonly collectionRepo: Repository<MoleculeCollection>,
        private readonly joinService: MoleculeCollectionItemJoinService,
        private readonly _RDKitService: RDKitService
    ) { }

    async addToCollection(
        userId: UUID,
        collectionId: UUID,
        input: CustomMoleculeItemInput,
        accessToken: string
    ): Promise<CustomMoleculeItemEntity> {

        return this.customRepo.manager.transaction(async manager => {

            input.canonicalSmiles = await this._RDKitService.toCanonicalSmiles({
                smiles: input.canonicalSmiles,
                accessToken
            })

            const r = await manager.createQueryBuilder(CustomMoleculeItemEntity, 'm')
                .select(['m.canonicalSmiles'])
                .where('m.userId = :userId', { userId })
                .andWhere('m.canonicalSmiles = :cs', { cs: input.canonicalSmiles })
                .getOne()

            if (r) {
                throw applicationError(ApplicationErrorCode.MOLECULE_SMILES_CONFLICT)
            } 

            let item = await this.customRepo.findOne({
                where: { canonicalSmiles: input.canonicalSmiles, userId }
            })

            if (!item) {                
                item = this.customRepo.create({
                    id: uuidv7() as UUID,
                    ...input,             
                    userId,
                    type: 'custom',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            } else {
                if (input.propertiesJson &&
                    input.propertiesJson !== item.propertiesJson) {
                    item.propertiesJson = input.propertiesJson;
                    item.updatedAt = Date.now();
                }
                if (input.label !== undefined) item.label = input.label;
                if (input.notes !== undefined) item.notes = input.notes;
                if (input.molFormula !== undefined) item.molFormula = input.molFormula;
                if (input.name !== undefined) item.name = input.name;
            }
            item = await manager.save(item);
            const collection = await this.collectionRepo.findOne({
                where: { id: collectionId, userId }
            })
            if (!collection) throw applicationError(ApplicationErrorCode.CUSTOM_ITEM_ACCESS_DENIED);
            await this.joinService.addMoleculeToCollectionWithManager(userId, collectionId, item.id, manager);

            return item;
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

}
