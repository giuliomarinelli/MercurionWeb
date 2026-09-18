import { Resolver, Query, Mutation, Args, ID, Info, Int, ResolveField, Parent } from '@nestjs/graphql';
import { AuthenticatedUserId } from 'src/metadata/metadata'; // tuo custom decorator userId
import { UUID } from 'crypto';
import { GraphQLResolveInfo } from 'graphql';
import { MoleculeCollection } from '../models/entities/molecule-collection.entity';
import { MoleculeCollectionService } from '../services/molecule-collection.service';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { PaginatedMoleculeCollection } from '../models/dto/paginated-molecule-collection';
import { InjectRepository } from '@nestjs/typeorm';
import { MoleculeCollectionItemJoin } from '../models/entities/molecule-collection-item-join.entity';
import { Repository } from 'typeorm';
import { MoleculeCollectionItemJoinService } from '../services/molecule-collection-item-join.service';
import { BindManyCollectionsToMoleculeDTO } from '../models/dto/bind-many-collections-to-molecule.dto';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { assertMercurionPublicId } from 'src/identifiers/mercurion-public-id';
import { toFlatPagination } from 'src/models/pagination/pagination.utils';
import { MoleculeCollectionPaginationArgs } from '../models/dto/molecule-collection-pagination.args';


@Resolver(() => MoleculeCollection)
export class MoleculeCollectionResolver {

    constructor(
        private readonly collectionService: MoleculeCollectionService,
        private readonly joinService: MoleculeCollectionItemJoinService,
        @InjectRepository(MoleculeCollectionItemJoin)
        private readonly joinRepo: Repository<MoleculeCollectionItemJoin>,
    ) { }

    @ResolveField(() => Int)
    async itemsCount(
        @Parent() collection: MoleculeCollection,
        @AuthenticatedUserId() userId: UUID
    ): Promise<number> {
        return this.joinRepo.count({ where: { collectionId: collection.id, userId } })
    }

    // Query: Lista collezioni dell'utente
    @Query(() => [MoleculeCollection])
    async myMoleculeCollections(
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollection[]> {
        // Info per selezione campi, come pattern visto prima
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.collectionService.findAllByUser(userId, fieldsMap)
    }

    // Query: Dettaglio collezione
    @Query(() => MoleculeCollection, { nullable: true })
    async moleculeCollection(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollection | null> {
        assertMercurionPublicId(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.collectionService.findOne(id, userId, fieldsMap)
    }

    @Query(() => [MoleculeCollection])
    async searchMyCollections(
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo,
        @Args('query', { nullable: true }) query?: string,
        @Args('limit', { nullable: true }) limit?: number
    ): Promise<MoleculeCollection[]> {
        const normalizedQuery = typeof query === 'string' ? query.trim() : query
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.collectionService.searchByName(userId, normalizedQuery, limit, fieldsMap)
    }

    @Mutation(() => MoleculeCollection, { nullable: true })
    async duplicateCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('srcCollectionId', { type: () => ID }) srcCollectionId: UUID
    ): Promise<MoleculeCollection | null> {
        // prima versione minimale, non chiede di creare con un nuovo nome, Duplica direttamente Vecchio Nome => Vecchio nome (1) ...
        // supporto per scelta del nuovo nome in versioni successive alla 1.0 beta 1
        assertMercurionPublicId(srcCollectionId, 'srcCollectionId')
        return this.collectionService.duplicate(userId, srcCollectionId)
    }

    @Mutation(() => MoleculeCollection)
    async createMoleculeCollection(
        @Args('name') name: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<MoleculeCollection> {
        const normalizedName = GeneralUtils.normalizeSpaces(name)
        return this.collectionService.create(userId, normalizedName)
    }

    @Mutation(() => Boolean)
    async createManyMoleculeCollections(
        @Args('names', { type: () => [String] }) names: string[],
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        const normalizedNames = names.map((n) => GeneralUtils.normalizeSpaces(n))
        return this.collectionService.createMany(userId, normalizedNames)
    }

    @Mutation(() => MoleculeCollection)
    async updateMoleculeCollection(
        @Args('id', { type: () => ID }) id: UUID,
        @Args('name') name: string,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollection | null> {
        assertMercurionPublicId(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const normalizedName = GeneralUtils.normalizeSpaces(name)
        return this.collectionService.update(id, userId, { name: normalizedName }, fieldsMap)
    }

    @Mutation(() => Boolean)
    async deleteMoleculeCollection(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        assertMercurionPublicId(id, 'id')
        return this.collectionService.delete(id, userId)
    }

    @Mutation(() => Boolean)
    async markMoleculeCollectionAsTouched(
        @Args('id', { type: () => ID }) collectionId: UUID,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        assertMercurionPublicId(collectionId, 'id')
        return await this.collectionService.markAsTouched(userId, collectionId)
    }

    @Query(() => PaginatedMoleculeCollection)
    async myMoleculeCollectionsPaginated(
        @AuthenticatedUserId() userId: UUID,
        @Args() pagination: MoleculeCollectionPaginationArgs,
        @Info() info: GraphQLResolveInfo
    ): Promise<PaginatedMoleculeCollection> {
        const { q, excludeJoinedToMolecule, moleculeId } = pagination
        const normalizedQ = typeof q === 'string' ? q.trim() : q
        

        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const paginated = await this.collectionService.paginateAllByUser(userId, pagination, normalizedQ, excludeJoinedToMolecule ?? false, moleculeId, fieldsMap);

        return toFlatPagination(paginated)
    }

    @Mutation(() => BindManyCollectionsToMoleculeDTO)
    async bindManyCollectionsToMolecule(
        @AuthenticatedUserId() userId: UUID,
        @Args('moleculeId', { type: () => ID }) moleculeId: string,
        @Args('collectionIds', { type: () => [ID] }) collectionIds: UUID[],
        @Args('selectAll', { type: () => Boolean }) selectAll: boolean
    ): Promise<BindManyCollectionsToMoleculeDTO> {
        collectionIds.forEach((collectionId) => assertMercurionPublicId(collectionId, 'collectionIds'))
        return this.joinService.bindManyCollectionsToMolecule(userId, moleculeId, collectionIds, selectAll)
    }


}
