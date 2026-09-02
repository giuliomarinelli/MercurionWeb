import { Resolver, Query, Mutation, Args, ID, Info, Int } from '@nestjs/graphql';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { GraphQLResolveInfo } from 'graphql';
import { MoleculeCollectionItemEntity } from '../Models/entities/molecule-collection-item.entity';
import { MoleculeCollectionItemService } from '../services/molecule-collection-item.service';
import { CreateMoleculeItemInput } from '../Models/DTO/create-molecule-item.input';
import { GraphQLUtils } from 'src/utils/graphql-utils/graphql-utils';
import { PaginatedMoleculeCollectionItem } from '../Models/DTO/paginated-molecule-collection-item.dto';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { CustomMoleculeItemDTO } from '../Models/DTO/custom-molecule-item.dto';
import { ChEMBLMoleculeItemDTO } from '../Models/DTO/chembl-molecule-item.dto';
import { MoleculeCollectionItemUnion } from '../Models/DTO/molecule-collection-item.union';
import { MoleculeCollectionItemJoinService } from '../services/molecule-collection-item-join.service';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';

@Resolver(() => MoleculeCollectionItemEntity)
export class MoleculeCollectionItemResolver {

    constructor(
        private readonly itemService: MoleculeCollectionItemService,
        private readonly joinService: MoleculeCollectionItemJoinService
    ) { }

    private ensureUuid(value: string, field: string): void {
        GeneralUtils.ensureValidUUIDv7(value, `GraphQLInvalid::Invalid ${field}`)
    }

    @Query(() => [MoleculeCollectionItemUnion])
    async myMoleculeItems(
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<Array<CustomMoleculeItemDTO | ChEMBLMoleculeItemDTO>> {
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.itemService.findAllByUser(userId, fieldsMap)
    }

    @Query(() => MoleculeCollectionItemUnion, { nullable: true })
    async moleculeItem(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<CustomMoleculeItemDTO | ChEMBLMoleculeItemDTO | null> {
        this.ensureUuid(id, 'id')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.itemService.findOneDTO(id, userId, fieldsMap)
    }

    @Query(() => PaginatedMoleculeCollectionItem)
    async paginatedMoleculeCollectionItemsByUser(
        @AuthenticatedUserId() userId: UUID,
        @Args('page', { type: () => Int }) page: number,
        @Args('limit', { type: () => Int }) limit: number,
        @Args('q', { type: () => String }) q: string,
        @Args('excludeJoinedToCollection', { type: () => Boolean, nullable: true }) excludeJoinedToCollection: boolean | null,
        @Args('collectionId', { type: () => ID, nullable: true }) collectionId: UUID | null,
        @Info() info: GraphQLResolveInfo
    ): Promise<PaginatedMoleculeCollectionItem> {
        const options: IPaginationOptions = { page, limit }
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const normalizedQ = typeof q === 'string' ? q.trim() : q
        return this.itemService.paginateAllByUser(userId, options, normalizedQ, excludeJoinedToCollection ?? false, collectionId, fieldsMap)
    }

    @Query(() => PaginatedMoleculeCollectionItem)
    async paginatedMoleculeCollectionItemsByCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => String }) collectionId: UUID,
        @Args('page', { type: () => Int }) page: number,
        @Args('limit', { type: () => Int }) limit: number,
        @Args('q', { type: () => String }) q: string,
        @Args('excluded', { type: () => Boolean, nullable: true }) excluded: boolean | null,
        @Info() info: GraphQLResolveInfo
    ): Promise<PaginatedMoleculeCollectionItem> {
        this.ensureUuid(collectionId, 'collectionId')
        const options: IPaginationOptions = { page, limit }
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const normalizedQ = typeof q === 'string' ? q.trim() : q
        return this.itemService.paginateByCollection(userId, collectionId, options, normalizedQ, excluded ?? false, fieldsMap)
    }

    @Mutation(() => MoleculeCollectionItemUnion)
    async createMoleculeItem(
        @Args('input') input: CreateMoleculeItemInput,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<CustomMoleculeItemDTO | ChEMBLMoleculeItemDTO> {
        const created = await this.itemService.create(userId, input)
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        const dto = await this.itemService.findOneDTO(created.id, userId, fieldsMap)
        if (!dto) {
            throw new Error('Created molecule item could not be reloaded')
        }
        return dto
    }

    @Mutation(() => MoleculeCollectionItemUnion)
    async updateMoleculeItem(
        @Args('id', { type: () => ID }) id: UUID,
        @Args('input') input: CreateMoleculeItemInput,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<CustomMoleculeItemDTO | ChEMBLMoleculeItemDTO | null> {
        this.ensureUuid(id, 'id')
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
        this.ensureUuid(id, 'id')
        return this.itemService.delete(id, userId)
    }

    @Mutation(() => Boolean)
    async markMoleculeCollectionItemAsTouched(
        @Args('id', { type: () => ID }) itemId: UUID,
        @Args('flagIds', { type: () => String }) flagIds: string,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        this.ensureUuid(itemId, 'id')
        const normalizedFlagIds = typeof flagIds === 'string' ? flagIds.trim() : flagIds
        return await this.itemService.markAsTouched(userId, itemId, normalizedFlagIds)
    }

    @Mutation(() => Boolean)
    async addManyMoleculesToCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('itemIds', { type: () => [ID] }) itemIds: UUID[],
        @Args('selectAll', { type: () => Boolean }) selectAll: boolean
    ): Promise<boolean> {
        this.ensureUuid(collectionId, 'collectionId')
        itemIds.forEach((itemId) => this.ensureUuid(itemId, 'itemIds'))
        try {
            await this.joinService.addManyMoleculesToCollection(userId, collectionId, itemIds, selectAll)
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
        this.ensureUuid(collectionId, 'collectionId')
        this.ensureUuid(itemId, 'itemId')
        return this.joinService.removeMoleculeFromCollection(userId, collectionId, itemId, deleteCollectionIfEmpty ?? false)
    }


}
