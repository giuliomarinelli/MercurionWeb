import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/type-orm-utils/type-orm-utils';
import { MoleculeCollection } from '../../Models/entities/molecule-collection/molecule-collection.entity';

@Injectable()
export class MoleculeCollectionService {

    private readonly REQUIRED_FIELDS = ['id', 'name']

    constructor(
        @InjectRepository(MoleculeCollection)
        private readonly collectionRepo: Repository<MoleculeCollection>,
    ) { }

    async create(userId: UUID, name: string ): Promise<MoleculeCollection> {
        const collection = this.collectionRepo.create({ name, userId })
        return this.collectionRepo.save(collection);
    }

    async findOne(id: UUID, userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollection | null> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)

        let qb = this.collectionRepo.createQueryBuilder('collection')
            .select(columns.map(col => `collection.${col}`))
            .where('collection.id = :id', { id })
            .andWhere('collection.user_id = :userId', { userId })

        qb = TypeOrmUtils.addJoins(qb, 'collection', fieldsMap)

        return qb.getOne()
    }

    async findAllByUser(userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollection[]> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)

        let qb = this.collectionRepo.createQueryBuilder('collection')
            .select(columns.map(col => `collection.${col}`))
            .where('collection.user_id = :userId', { userId })
            .orderBy('collection.name', 'ASC')

        qb = TypeOrmUtils.addJoins(qb, 'collection', fieldsMap)

        return qb.getMany()
    }

    async update(id: UUID, userId: UUID, input: Partial<MoleculeCollection>, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollection | null> {
        await this.collectionRepo.update({ id }, { ...input })
        return this.findOne(id, userId, fieldsMap)
    }

    async delete(id: UUID, userId: UUID): Promise<boolean> {
        try {
            await this.collectionRepo.delete({ id, userId })
            return true
        } catch {
            return false
        }
    }
}
