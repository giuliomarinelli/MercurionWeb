import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { GraphqlUtils } from 'src/utils/graphql-utils/graphql-utils';
import { GraphQLFieldsMap, TypeOrmUtils } from 'src/utils/type-orm-utils/type-orm-utils';
import { MoleculeCollection } from '../Models/entities/molecule-collection.entity';
import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate';
import { History } from 'src/app_modules/history/Models/entities/history.entity';
import { HistoryItemEntity } from 'src/app_modules/history/Models/enums/history-item-entity.enum';
import { uuidv7 } from '@kripod/uuidv7';

@Injectable()
export class MoleculeCollectionService {

    private readonly REQUIRED_FIELDS = ['id', 'name']

    private readonly logger = new Logger(MoleculeCollectionService.name)

    constructor(
        @InjectRepository(MoleculeCollection)
        private readonly collectionRepo: Repository<MoleculeCollection>,
        private readonly dataSource: DataSource
    ) { }

    async markAsTouched(userId: UUID, collectionId: UUID): Promise<boolean> {
        try {
            if (await this.collectionRepo.exists({ where: { userId, id: collectionId } })) {
                await this.dataSource.manager.transaction(async (manager) => {
                    const touchedAt = Date.now()
                    await manager.update(MoleculeCollection, { userId, id: collectionId }, { touchedAt })
                    await manager.insert(History, {
                        id: uuidv7() as UUID,
                        itemEntity: HistoryItemEntity.MoleculeCollection,
                        userId,
                        touchedAt,
                        itemId: collectionId
                    })
                })
            }
            return true
        } catch (e) {
            this.logger.warn(`MoleculeCollectionService > markAsTouched: UPDATE FAILED => ${e}`)
            return false
        }
    }

    async create(userId: UUID, name: string): Promise<MoleculeCollection> {
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
        await this.collectionRepo.update({ id }, { ...input, updatedAt: Date.now() })
        await this.markAsTouched(userId, id)
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

    async searchByName(userId: UUID, query: string | undefined, limit: number = 10, fieldsMap: GraphQLFieldsMap): Promise<MoleculeCollection[]> {
        const scalarFields = GraphqlUtils.getScalarFields(fieldsMap)
        const columns = GraphqlUtils.ensureRequiredFields(scalarFields, this.REQUIRED_FIELDS)

        let qb = this.collectionRepo.createQueryBuilder('collection')
            .select(columns.map(col => `collection.${col}`))
            .where('collection.user_id = :userId', { userId });

        if (query) {
            qb = qb.andWhere('collection.name LIKE :query', { query: `%${query}%` })
        }

        qb = qb.orderBy('collection.updatedAt', 'DESC')
            .limit(limit)

        qb = TypeOrmUtils.addJoins(qb, 'collection', fieldsMap)
        return qb.getMany()
    }

    async paginateByUser(
        userId: UUID,
        options: IPaginationOptions,
        searchTerm: string = '',
        fieldsMap?: GraphQLFieldsMap,
    ): Promise<Pagination<MoleculeCollection>> {
        // Prendi i campi richiesti dentro "items"
        const itemsFields = fieldsMap?.items ? Object.keys(fieldsMap.items).filter(k => k !== '__typename') : [];
        // I campi "esterni" non servono nella select
        // Unisci ai requiredFields
        const columns = GraphqlUtils.ensureRequiredFields(itemsFields, this.REQUIRED_FIELDS).filter(c => c !== 'itemsCount')

        let qb = this.collectionRepo.createQueryBuilder('collection')
            .select(columns.map(col => `collection.${col}`))
            .where('collection.user_id = :userId', { userId })

        if (searchTerm.trim()) {
            qb = qb.andWhere('collection.name ILIKE :query', { query: `%${searchTerm}%` })
        }

        qb = qb.orderBy('collection.touchedAt', 'DESC')
        // le join sulle relazioni puoi farle se richieste

        return paginate<MoleculeCollection>(qb, options)
    }



}
