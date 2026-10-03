import { Resolver, Query, Mutation, Args, ID, Info, Int, ResolveField, Parent } from '@nestjs/graphql';
import { AuthenticatedUserId } from 'src/metadata/metadata'; // tuo custom decorator userId
import { UUID } from 'crypto';
import { GraphQLResolveInfo } from 'graphql';
import { MoleculeCollection } from '../models/entities/molecule-collection.entity';
import { MoleculeCollectionService } from '../services/molecule-collection.service';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { PaginatedMoleculeCollection } from '../models/dto/paginated-molecule-collection';
import { MoleculeCollectionItemJoinService } from '../services/molecule-collection-item-join.service';
import { MoleculeCollectionItemCountLoader } from '../services/molecule-collection-item-count.loader';
import { BindManyCollectionsToMoleculeDTO } from '../models/dto/bind-many-collections-to-molecule.dto';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { assertMercurionPublicId } from 'src/identifiers/mercurion-public-id';
import { toFlatPagination } from 'src/models/pagination/pagination.utils';
import { MoleculeCollectionPaginationArgs } from '../models/dto/molecule-collection-pagination.args';
import { RealtimeStateSyncService } from 'src/app_modules/socket-io/realtime-state-sync.service';


@Resolver(() => MoleculeCollection)
export class MoleculeCollectionResolver {

    constructor(
        private readonly collectionService: MoleculeCollectionService,
        private readonly joinService: MoleculeCollectionItemJoinService,
        private readonly itemCountLoader: MoleculeCollectionItemCountLoader,
        private readonly stateSync: RealtimeStateSyncService,
    ) { }

    @ResolveField(() => Int)
    async itemsCount(
        @Parent() collection: MoleculeCollection,
        @AuthenticatedUserId() userId: UUID
    ): Promise<number> {
        return this.itemCountLoader.load(userId, collection.id)
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
        const duplicated = await this.collectionService.duplicate(userId, srcCollectionId)
        if (duplicated) {
            this.stateSync.publishToUser(userId, {
                kind: 'resource-state-changed',
                domain: 'molecule-collection',
                change: 'created',
                resourceId: duplicated.id
            })
        }
        return duplicated
    }

    @Mutation(() => MoleculeCollection)
    async createMoleculeCollection(
        @Args('name') name: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<MoleculeCollection> {
        const normalizedName = GeneralUtils.normalizeSpaces(name)
        const created = await this.collectionService.create(userId, normalizedName)
        this.stateSync.publishToUser(userId, {
            kind: 'resource-state-changed',
            domain: 'molecule-collection',
            change: 'created',
            resourceId: created.id
        })
        return created
    }

    @Mutation(() => Boolean)
    async createManyMoleculeCollections(
        @Args('names', { type: () => [String] }) names: string[],
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        const normalizedNames = names.map((n) => GeneralUtils.normalizeSpaces(n))
        const created = await this.collectionService.createMany(userId, normalizedNames)
        if (created) {
            this.stateSync.publishToUser(userId, {
                kind: 'resource-state-changed',
                domain: 'molecule-collection',
                change: 'created'
            })
        }
        return created
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
        const updated = await this.collectionService.update(id, userId, { name: normalizedName }, fieldsMap)
        if (updated) {
            this.stateSync.publishToUser(userId, {
                kind: 'resource-state-changed',
                domain: 'molecule-collection',
                change: 'updated',
                resourceId: id
            })
        }
        return updated
    }

    @Mutation(() => Boolean)
    async deleteMoleculeCollection(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        assertMercurionPublicId(id, 'id')
        const deleted = await this.collectionService.delete(id, userId)
        if (deleted) {
            this.stateSync.publishToUser(userId, {
                kind: 'resource-state-changed',
                domain: 'molecule-collection',
                change: 'deleted',
                resourceId: id
            })
            this.stateSync.publishToUser(userId, {
                kind: 'resource-state-changed',
                domain: 'molecule',
                change: 'content-changed'
            })
        }
        return deleted
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
        @Args('selectAll', { type: () => Boolean }) selectAll: boolean,
        @Args('snapshotAt', { type: () => String, nullable: true }) snapshotAt?: string
    ): Promise<BindManyCollectionsToMoleculeDTO> {
        collectionIds.forEach((collectionId) => assertMercurionPublicId(collectionId, 'collectionIds'))
        const result = await this.joinService.bindManyCollectionsToMolecule(userId, moleculeId, collectionIds, selectAll, snapshotAt)
        this.stateSync.publishToUser(userId, {
            kind: 'resource-state-changed',
            domain: 'molecule',
            change: 'content-changed',
            resourceId: moleculeId
        })
        if (selectAll || collectionIds.length > 20) {
            this.stateSync.publishToUser(userId, {
                kind: 'resource-state-changed',
                domain: 'molecule-collection',
                change: 'content-changed'
            })
        } else {
            for (const collectionId of collectionIds) {
                this.stateSync.publishToUser(userId, {
                    kind: 'resource-state-changed',
                    domain: 'molecule-collection',
                    change: 'content-changed',
                    resourceId: collectionId
                })
            }
        }
        return result
    }


}
