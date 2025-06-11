// src/resolvers/molecule-collection/molecule-collection-item.resolver.ts
import { Resolver, Query, Mutation, Args, ID, Info } from '@nestjs/graphql';
import { AuthenticatedUserId } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { GraphQLResolveInfo } from 'graphql';
import { MoleculeCollectionItemEntity } from '../../Models/entities/molecule-collection/molecule-collection-item.entity';
import { MoleculeCollectionItemService } from '../../services/molecule-collection/molecule-collection-item.service';
import { CreateMoleculeItemInput } from '../../Models/DTO/molecule-collection/create-molecule-item.input';
import { GraphqlUtils } from 'src/graphql-utils/graphql-utils';

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
