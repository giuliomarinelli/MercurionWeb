import { Resolver, Query, Mutation, Args, ID, Info, Int, ResolveField, Parent } from '@nestjs/graphql';
import { AuthenticatedUserId } from 'src/metadata/metadata'; // tuo custom decorator userId
import { UUID } from 'crypto';
import { GraphQLResolveInfo } from 'graphql';
import { MoleculeCollection } from '../Models/entities/molecule-collection.entity';
import { MoleculeCollectionService } from '../services/molecule-collection.service';
import { GraphqlUtils } from 'src/utils/graphql-utils/graphql-utils';
import { PaginatedMoleculeCollection } from '../Models/DTO/paginated-molecule-collection';
import { InjectRepository } from '@nestjs/typeorm';
import { MoleculeCollectionItemJoin } from '../Models/entities/molecule-collection-item-join.entity';
import { Repository } from 'typeorm';
import { MoleculeCollectionItemJoinService } from '../services/molecule-collection-item-join.service';


@Resolver(() => MoleculeCollection)
export class MoleculeCollectionResolver {

    constructor(
        private readonly collectionService: MoleculeCollectionService,
        private readonly joinService: MoleculeCollectionItemJoinService,
        @InjectRepository(MoleculeCollectionItemJoin)
        private readonly joinRepo: Repository<MoleculeCollectionItemJoin>,
    ) { }

    @ResolveField(() => Int)
    async itemsCount(@Parent() collection: MoleculeCollection): Promise<number> {
        return this.joinRepo.count({ where: { collectionId: collection.id } })
    }

    // Query: Lista collezioni dell'utente
    @Query(() => [MoleculeCollection])
    async myMoleculeCollections(
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollection[]> {
        // Info per selezione campi, come pattern visto prima
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.collectionService.findAllByUser(userId, fieldsMap)
    }

    // Query: Dettaglio collezione
    @Query(() => MoleculeCollection, { nullable: true })
    async moleculeCollection(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollection | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.collectionService.findOne(id, userId, fieldsMap)
    }

    @Query(() => [MoleculeCollection])
    async searchMyCollections(
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo,
        @Args('query', { nullable: true }) query?: string,
        @Args('limit', { nullable: true }) limit?: number
    ): Promise<MoleculeCollection[]> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.collectionService.searchByName(userId, query, limit, fieldsMap)
    }

    @Mutation(() => MoleculeCollection)
    async createMoleculeCollection(
        @Args('name') name: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<MoleculeCollection> {
        return this.collectionService.create(userId, name)
    }

    @Mutation(() => Boolean)
    async createManyMoleculeCollections(
        @Args('names', { type: () => [String] }) names: string[],
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.collectionService.createMany(userId, names)
    }

    @Mutation(() => MoleculeCollection)
    async updateMoleculeCollection(
        @Args('id', { type: () => ID }) id: UUID,
        @Args('name') name: string,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollection | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.collectionService.update(id, userId, { name }, fieldsMap)
    }

    @Mutation(() => Boolean)
    async deleteMoleculeCollection(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.collectionService.delete(id, userId)
    }

    @Mutation(() => Boolean)
    async markMoleculeCollectionAsTouched(
        @Args('id', { type: () => ID }) collectionId: UUID,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return await this.collectionService.markAsTouched(userId, collectionId)
    }

    @Query(() => PaginatedMoleculeCollection)
    async myMoleculeCollectionsPaginated(
        @AuthenticatedUserId() userId: UUID,
        @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
        @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
        @Args('excludeJoinedToMolecule', { type: () => Boolean, nullable: true }) excludeJoinedToMolecule: boolean | null,
        @Args('moleculeId', { type: () => ID, nullable: true }) moleculeId: UUID | null,
        @Info() info: GraphQLResolveInfo,
        @Args('q', { type: () => String }) q: string
    ): Promise<PaginatedMoleculeCollection> {

        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        const paginated = await this.collectionService.paginateAllByUser(userId, { page, limit }, q, excludeJoinedToMolecule ?? false, moleculeId, fieldsMap);

        return {
            items: paginated.items,
            itemCount: paginated.meta.itemCount,
            totalItems: Number(paginated.meta.totalItems),
            itemsPerPage: paginated.meta.itemsPerPage,
            totalPages: Number(paginated.meta.totalPages),
            currentPage: paginated.meta.currentPage,
        }
    }

    @Mutation(() => Boolean)
    async bindManyCollectionsToMolecule(
        @AuthenticatedUserId() userId: UUID,
        @Args('moleculeId', { type: () => ID }) moleculeId: string,
        @Args('collectionIds', { type: () => [ID] }) collectionIds: UUID[],
        @Args('selectAll', { type: () => Boolean }) selectAll: boolean
    ): Promise<boolean> {
        return this.joinService.bindManyCollectionsToMolecule(userId, moleculeId, collectionIds, selectAll)
    }


}
