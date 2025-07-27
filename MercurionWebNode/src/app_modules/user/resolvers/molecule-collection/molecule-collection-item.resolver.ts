import { Resolver, Query, Mutation, Args, ID, Info } from '@nestjs/graphql';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { GraphQLResolveInfo } from 'graphql';
import { MoleculeCollectionItemEntity } from '../../Models/entities/molecule-collection/molecule-collection-item.entity';
import { MoleculeCollectionItemService } from '../../services/molecule-collection/molecule-collection-item.service';
import { CreateMoleculeItemInput } from '../../Models/DTO/molecule-collection/create-molecule-item.input';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';
import { PaginatedMoleculeCollectionItem } from '../../Models/DTO/molecule-collection/paginated-molecule-collection-item.dto';
import { IPaginationOptions } from 'nestjs-typeorm-paginate';

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

    @Query(() => MoleculeCollectionItemEntity, { nullable: true })
    async moleculeItem(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<MoleculeCollectionItemEntity | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.itemService.findOne(id, userId, fieldsMap)
    }

    @Query(() => PaginatedMoleculeCollectionItem)
    async paginatedMoleculeCollectionItemsByUser(
        @AuthenticatedUserId() userId: UUID,
        @Args('page') page: number,
        @Args('limit') limit: number,
        @Info() info: GraphQLResolveInfo
    ): Promise<PaginatedMoleculeCollectionItem> {
        const options: IPaginationOptions = { page, limit }
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.itemService.paginateAllByUser(userId, options, fieldsMap)
    }

    @Query(() => PaginatedMoleculeCollectionItem)
    async paginatedMoleculeCollectionItemsByCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId') collectionId: UUID,
        @Args('page') page: number,
        @Args('limit') limit: number,
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
}
