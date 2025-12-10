import { MoleculeCollectionItemJoinService } from './molecule-collection-item-join.service';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomMoleculeItemEntity } from "../Models/entities/custom-molecule-item.entity";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { CustomMoleculeItemInput } from "../Models/DTO/custom-molecule-item.input";
import { MoleculeCollection } from '../Models/entities/molecule-collection.entity';
import { RpcException } from '@nestjs/microservices';
import { uuidv7 } from '@kripod/uuidv7';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/utils/type-orm-utils/type-orm-utils';

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

    async addToCollection(
        userId: UUID,
        collectionId: UUID,
        input: CustomMoleculeItemInput
    ): Promise<CustomMoleculeItemEntity> {
        // 1️⃣ Cerco se esiste già la molecola per quel user+SMILES
        return this.customRepo.manager.transaction(async manager => {
            let item = await this.customRepo.findOne({
                where: { canonicalSmiles: input.canonicalSmiles, userId }
            });

            if (!item) {
                // 2️⃣ Non c'è? La creo da zero
                item = this.customRepo.create({
                    id: uuidv7() as UUID,
                    ...input,             // ⬅ contiene già propertiesJson numerico ✔
                    userId,
                    type: 'custom',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
            } else {
                // 3️⃣ Esiste? Aggiorno SOLO i campi arrivati da input
                //    (nel tuo caso propertiesJson, ma estendibile a label/notes ecc.)
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

            // 4️⃣ Persisto sempre (creazione o update che sia)
            item = await manager.save(item);

            // 5️⃣ Controllo ownership della collection
            const collection = await this.collectionRepo.findOne({
                where: { id: collectionId, userId }
            });
            if (!collection) throw new RpcException('CustomItemAddError::Forbidden');

            // 6️⃣ Link nella join‑table (ignora duplicati all’interno di add)
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
        return qb.getOne()
    }

}
