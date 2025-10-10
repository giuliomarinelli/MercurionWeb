    import { Injectable } from '@nestjs/common';
    import { InjectRepository } from '@nestjs/typeorm';
    import { Repository } from 'typeorm';
    import { UUID } from 'crypto';
    import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';
    import { GraphQLFieldsMap, TypeOrmUtils } from 'src/type-orm-utils/type-orm-utils';
    import { MoleculeCollection } from '../../Models/entities/molecule-collection/molecule-collection.entity';
    import { IPaginationOptions, paginate, Pagination } from 'nestjs-typeorm-paginate';

    @Injectable()
    export class MoleculeCollectionService {

        private readonly REQUIRED_FIELDS = ['id', 'name']

        constructor(
            @InjectRepository(MoleculeCollection)
            private readonly collectionRepo: Repository<MoleculeCollection>,
        ) { }

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
            search?: string,
            fieldsMap?: GraphQLFieldsMap
        ): Promise<Pagination<MoleculeCollection>> {
            // Prendi i campi richiesti dentro "items"
            const itemsFields = fieldsMap?.items ? Object.keys(fieldsMap.items).filter(k => k !== '__typename') : [];
            // I campi "esterni" non servono nella select
            // Unisci ai requiredFields
            const columns = GraphqlUtils.ensureRequiredFields(itemsFields, this.REQUIRED_FIELDS).filter(c => c !== 'itemsCount')

            let qb = this.collectionRepo.createQueryBuilder('collection')
                .select(columns.map(col => `collection.${col}`))
                .where('collection.user_id = :userId', { userId })

            if (search) {
                qb = qb.andWhere('collection.name ILIKE :query', { query: `%${search}%` })
            }

            qb = qb.orderBy('collection.updatedAt', 'DESC')
            // le join sulle relazioni puoi farle se richieste

            return paginate<MoleculeCollection>(qb, options)
        }



    }
