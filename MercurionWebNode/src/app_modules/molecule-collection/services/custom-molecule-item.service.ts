import { MoleculeCollectionItemJoinService } from './molecule-collection-item-join.service';
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CustomMoleculeItemEntity } from "../Models/entities/custom-molecule-item.entity";
import { Repository } from "typeorm";
import { UUID } from "crypto";
import { GraphQLFieldsMap } from "src/utils/type-orm-utils/type-orm-utils";
import { GraphqlUtils } from "src/utils/graphql-utils/graphql-utils";
import { CustomMoleculeItemInput } from "../Models/DTO/custom-molecule-item.input";
import { MoleculeCollection } from '../Models/entities/molecule-collection.entity';
import { RpcException } from '@nestjs/microservices';
import { uuidv7 } from '@kripod/uuidv7';

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
        item = await this.customRepo.save(item);

        // 5️⃣ Controllo ownership della collection
        const collection = await this.collectionRepo.findOne({
            where: { id: collectionId, userId }
        });
        if (!collection) throw new RpcException('CustomItemAddError::Forbidden');

        // 6️⃣ Link nella join‑table (ignora duplicati all’interno di add)
        await this.joinService.add(userId, collectionId, item.id);

        return item;
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
