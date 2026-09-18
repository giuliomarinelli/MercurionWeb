import { Resolver, Query, Mutation, Args, ID, Info } from '@nestjs/graphql';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { GraphQLResolveInfo } from 'graphql';
import { MoleculeCollectionItemService } from '../services/molecule-collection-item.service';
import { CreateMoleculeItemInput } from '../models/dto/create-molecule-item.input';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { PaginatedMoleculeCollectionItem } from '../models/dto/paginated-molecule-collection-item.dto';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import {
    MoleculeCollectionItemDTO,
    MoleculeCollectionItemUnion
} from '../models/dto/molecule-collection-item.union';
import { MoleculeCollectionItemJoinService } from '../services/molecule-collection-item-join.service';
import { assertMercurionPublicId } from 'src/identifiers/mercurion-public-id';
import {
    MoleculeItemsByCollectionArgs,
    MoleculeItemsByUserArgs
} from '../models/dto/molecule-collection-item-pagination.args';

@Resolver()
export class MoleculeCollectionItemResolver {

    constructor(
        private readonly itemService: MoleculeCollectionItemService,
        private readonly joinService: MoleculeCollectionItemJoinService
    ) { }

    @Query(() => [MoleculeCollectionItemUnion])
    async myMoleculeItems(
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollectionItemDTO[]> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.itemService.findAllByUser(userId, fieldsMap)
    }

    @Query(() => MoleculeCollectionItemUnion, { nullable: true })
    async moleculeItem(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollectionItemDTO | null> {
        assertMercurionPublicId(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.itemService.findOneDTO(id, userId, fieldsMap)
    }

    @Query(() => PaginatedMoleculeCollectionItem)
    async paginatedMoleculeCollectionItemsByUser(
        @AuthenticatedUserId() userId: UUID,
        @Args() pagination: MoleculeItemsByUserArgs,
        @Info() info: GraphQLResolveInfo
    ): Promise<PaginatedMoleculeCollectionItem> {
        const { q, excludeJoinedToCollection, collectionId } = pagination
        const options: IPaginationOptions = pagination
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const normalizedQ = typeof q === 'string' ? q.trim() : q
        return this.itemService.paginateAllByUser(userId, options, normalizedQ, excludeJoinedToCollection ?? false, collectionId, fieldsMap)
    }

    @Query(() => PaginatedMoleculeCollectionItem)
    async paginatedMoleculeCollectionItemsByCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args() pagination: MoleculeItemsByCollectionArgs,
        @Info() info: GraphQLResolveInfo
    ): Promise<PaginatedMoleculeCollectionItem> {
        const { collectionId, q, excluded } = pagination
        assertMercurionPublicId(collectionId, 'collectionId')
        const options: IPaginationOptions = pagination
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const normalizedQ = typeof q === 'string' ? q.trim() : q
        return this.itemService.paginateByCollection(userId, collectionId, options, normalizedQ, excluded ?? false, fieldsMap)
    }

    @Mutation(() => MoleculeCollectionItemUnion)
    async createMoleculeItem(
        @Args('input') input: CreateMoleculeItemInput,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollectionItemDTO> {
        const created = await this.itemService.create(userId, input)
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const dto = await this.itemService.findOneDTO(created.id, userId, fieldsMap)
        if (!dto) {
            throw new Error('Created molecule item could not be reloaded')
        }
        return dto
    }

    @Mutation(() => MoleculeCollectionItemUnion, { nullable: true })
    async updateMoleculeItem(
        @Args('id', { type: () => ID }) id: UUID,
        @Args('input') input: CreateMoleculeItemInput,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollectionItemDTO | null> {
        assertMercurionPublicId(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const updated = await this.itemService.update(id, userId, input, fieldsMap)
        return updated
            ? this.itemService.findOneDTO(id, userId, fieldsMap)
            : null
    }

    @Mutation(() => Boolean)
    async deleteMoleculeItem(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        assertMercurionPublicId(id, 'id')
        return this.itemService.delete(id, userId)
    }

    @Mutation(() => Boolean)
    async markMoleculeCollectionItemAsTouched(
        @Args('id', { type: () => ID }) itemId: UUID,
        @Args('flagIds', { type: () => String }) flagIds: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        assertMercurionPublicId(itemId, 'id')
        const normalizedFlagIds = typeof flagIds === 'string' ? flagIds.trim() : flagIds
        return await this.itemService.markAsTouched(userId, itemId, normalizedFlagIds)
    }

    @Mutation(() => Boolean)
    async addManyMoleculesToCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('itemIds', { type: () => [ID] }) itemIds: UUID[],
        @Args('selectAll', { type: () => Boolean }) selectAll: boolean,
        @Args('snapshotAt', { type: () => String, nullable: true }) snapshotAt?: string
    ): Promise<boolean> {
        assertMercurionPublicId(collectionId, 'collectionId')
        itemIds.forEach((itemId) => assertMercurionPublicId(itemId, 'itemIds'))
        try {
            await this.joinService.addManyMoleculesToCollection(userId, collectionId, itemIds, selectAll, snapshotAt)
            return true
        } catch {
            return false
        }
    }

    @Mutation(() => Boolean)
    async removeMoleculeFromCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('itemId', { type: () => ID }) itemId: UUID,
        @Args('deleteCollectionIfEmpty', { type: () => Boolean, nullable: true }) deleteCollectionIfEmpty: boolean | null
    ): Promise<boolean> {
        assertMercurionPublicId(collectionId, 'collectionId')
        assertMercurionPublicId(itemId, 'itemId')
        return this.joinService.removeMoleculeFromCollection(userId, collectionId, itemId, deleteCollectionIfEmpty ?? false)
    }


}
