import { Resolver, Query, Mutation, Args, ID, Info, Int } from '@nestjs/graphql';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { GraphQLResolveInfo } from 'graphql';
import { MoleculeCollectionItemEntity } from '../../Models/entities/molecule-collection/molecule-collection-item.entity';
import { MoleculeCollectionItemService } from '../../services/molecule-collection/molecule-collection-item.service';
import { CreateMoleculeItemInput } from '../../Models/DTO/molecule-collection/create-molecule-item.input';
import { GraphqlUtils } from 'src/utils/graphql-utils/graphql-utils';
import { PaginatedMoleculeCollectionItem } from '../../Models/DTO/molecule-collection/paginated-molecule-collection-item.dto';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';
import { CustomMoleculeItemDTO } from '../../Models/DTO/molecule-collection/custom-molecule-item.dto';
import { ChEMBLMoleculeItemDTO } from '../../Models/DTO/molecule-collection/chembl-molecule-item.dto';
import { MoleculeCollectionItemUnion } from '../../Models/DTO/molecule-collection/molecule-collection-item.union';

@Resolver(() => MoleculeCollectionItemEntity)
export class MoleculeCollectionItemResolver {

    constructor(private readonly itemService: MoleculeCollectionItemService) { }

    @Query(() => [MoleculeCollectionItemEntity])
    async myMoleculeItems(
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollectionItemEntity[]> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.itemService.findAllByUser(userId, fieldsMap)
    }

    @Query(() => MoleculeCollectionItemUnion, { nullable: true })
    async moleculeItem(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<CustomMoleculeItemDTO | ChEMBLMoleculeItemDTO | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.itemService.findOneDTO(id, userId, fieldsMap)
    }

    @Query(() => PaginatedMoleculeCollectionItem)
    async paginatedMoleculeCollectionItemsByUser(
        @AuthenticatedUserId() userId: UUID,
        @Args('page', { type: () => Int }) page: number,
        @Args('limit', { type: () => Int }) limit: number,
        @Info() info: GraphQLResolveInfo
    ): Promise<PaginatedMoleculeCollectionItem> {
        const options: IPaginationOptions = { page, limit }
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.itemService.paginateAllByUser(userId, options, fieldsMap)
    }

    @Query(() => PaginatedMoleculeCollectionItem)
    async paginatedMoleculeCollectionItemsByCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => String }) collectionId: UUID,
        @Args('page', { type: () => Int }) page: number,
        @Args('limit', { type: () => Int }) limit: number,
        @Info() info: GraphQLResolveInfo
    ): Promise<PaginatedMoleculeCollectionItem> {
        const options: IPaginationOptions = { page, limit }
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.itemService.paginateByCollection(userId, collectionId, options, fieldsMap)
    }


    @Mutation(() => MoleculeCollectionItemEntity)
    async createMoleculeItem(
        @Args('input') input: CreateMoleculeItemInput,
        @AuthenticatedUserId() userId: UUID
    ): Promise<MoleculeCollectionItemEntity> {
        return this.itemService.create(userId, input)
    }

    @Mutation(() => MoleculeCollectionItemEntity)
    async updateMoleculeItem(
        @Args('id', { type: () => ID }) id: UUID,
        @Args('input') input: CreateMoleculeItemInput,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollectionItemEntity | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.itemService.update(id, userId, input, fieldsMap)
    }

    @Mutation(() => Boolean)
    async deleteMoleculeItem(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return this.itemService.delete(id, userId)
    }

    @Mutation(() => Boolean)
    async markMoleculeCollectionItemAsTouched(
        @Args('id', { type: () => ID }) itemId: UUID,
        @AuthenticatedUserId() userId: UUID
    ): Promise<boolean> {
        return await this.itemService.markAsTouched(userId, itemId)
    }


}
