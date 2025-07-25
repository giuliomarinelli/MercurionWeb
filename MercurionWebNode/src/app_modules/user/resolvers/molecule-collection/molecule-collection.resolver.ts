import { Resolver, Query, Mutation, Args, ID, Info, Int } from '@nestjs/graphql';
import { AuthenticatedUserId } from 'src/metadata/metadata'; // tuo custom decorator userId
import { UUID } from 'crypto';
import { GraphQLResolveInfo } from 'graphql';
import { MoleculeCollection } from '../../Models/entities/molecule-collection/molecule-collection.entity';
import { MoleculeCollectionService } from '../../services/molecule-collection/molecule-collection.service';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';
import { PaginatedMoleculeCollection } from '../../Models/DTO/molecule-collection/paginated-molecule-collection';


@Resolver(() => MoleculeCollection)
export class MoleculeCollectionResolver {

    constructor(private readonly collectionService: MoleculeCollectionService) { }

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

    // Mutation: Crea collezione
    @Mutation(() => MoleculeCollection)
    async createMoleculeCollection(
        @Args('name') name: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<MoleculeCollection> {
        return this.collectionService.create(userId, name)
    }

    // Mutation: Aggiorna collezione
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

    // Mutation: Elimina collezione
    @Mutation(() => Boolean)
    async deleteMoleculeCollection(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.collectionService.delete(id, userId)
    }

    @Query(() => PaginatedMoleculeCollection)
    async myMoleculeCollectionsPaginated(
        @AuthenticatedUserId() userId: UUID,
        @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
        @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
        @Info() info: GraphQLResolveInfo,
        @Args('search', { type: () => String, nullable: true }) search?: string
    ): Promise<PaginatedMoleculeCollection> {

        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        const paginated = await this.collectionService.paginateByUser(userId, { page, limit }, search, fieldsMap);

        return {
            items: paginated.items,
            itemCount: paginated.meta.itemCount,
            totalItems: Number(paginated.meta.totalItems),
            itemsPerPage: paginated.meta.itemsPerPage,
            totalPages: Number(paginated.meta.totalPages),
            currentPage: paginated.meta.currentPage,
        }
    }


}
