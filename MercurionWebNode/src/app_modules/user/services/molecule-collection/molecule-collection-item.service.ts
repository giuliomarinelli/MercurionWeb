// src/services/molecule-collection/molecule-collection-item.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';
import { MoleculeCollectionItemEntity } from '../../Models/entities/molecule-collection/molecule-collection-item.entity';
import { CreateMoleculeItemInput } from '../../Models/DTO/molecule-collection/create-molecule-item.input';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/type-orm-utils/type-orm-utils';

@Injectable()
export class MoleculeCollectionItemService {

    constructor(
        @InjectRepository(MoleculeCollectionItemEntity)
        private readonly itemRepo: Repository<MoleculeCollectionItemEntity>,
    ) { }

    async create(userId: UUID, input: CreateMoleculeItemInput): Promise<MoleculeCollectionItemEntity> {
        const entity = this.itemRepo.create({ ...input, userId })
        return this.itemRepo.save(entity)
    }

    async findOne(id: UUID, userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollectionItemEntity | null> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, ['id', 'type'])
        let qb = this.itemRepo.createQueryBuilder('item')
            .select(columns.map(col => `item.${col}`))
            .where('item.id = :id', { id })
            .andWhere('item.userId = :userId', { userId })
        qb = TypeOrmUtils.addJoins(qb, 'item', fieldsMap)
        return qb.getOne()
    }

    async findAllByUser(userId: UUID, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollectionItemEntity[]> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, ['id', 'type'])
        let qb = this.itemRepo.createQueryBuilder('item')
            .select(columns.map(col => `item.${col}`))
            .where('item.userId = :userId', { userId })
        qb = TypeOrmUtils.addJoins(qb, 'item', fieldsMap)
        return qb.getMany()
    }

    async update(id: UUID, userId: UUID, input: Partial<MoleculeCollectionItemEntity>, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollectionItemEntity | null> {
        await this.itemRepo.update({ id, userId }, { ...input })
        return this.findOne(id, userId, fieldsMap)
    }

    async delete(id: UUID, userId: UUID): Promise<boolean> {
        try {
            await this.itemRepo.delete({ id, userId })
            return true
        } catch {
            return false
        }
    }
}
