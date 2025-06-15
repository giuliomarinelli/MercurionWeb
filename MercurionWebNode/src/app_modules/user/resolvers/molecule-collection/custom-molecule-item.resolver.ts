import { Args, ID, Info, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CustomMoleculeItemEntity } from "../../Models/entities/molecule-collection/custom-molecule-item.entity";
import { CustomMoleculeItemService } from "../../services/molecule-collection/custom-molecule-item.service";
import { AuthenticatedUserId } from "src/metadata/metadata";
import { UUID } from "crypto";
import { GraphQLResolveInfo } from 'graphql';
import { GraphqlUtils } from "src/graphql-utils/graphql-utils";
import { CustomMoleculeItemInput } from "../../Models/DTO/molecule-collection/custom-molecule-item.input";

@Resolver(() => CustomMoleculeItemEntity)
export class CustomMoleculeItemResolver {

    constructor(private readonly service: CustomMoleculeItemService) { }

    @Query(() => [CustomMoleculeItemEntity])
    async customMoleculesByCollection(
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.service.findByCollection(collectionId, userId, fieldsMap)
    }

    @Query(() => CustomMoleculeItemEntity, { nullable: true })
    findOneCustomMoleculeById(
        @Args('itemId', { type: () => ID }) itemId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.service.findOneById(itemId, userId, fieldsMap)
    }

    @Mutation(() => CustomMoleculeItemEntity)
    async addCustomMoleculeToCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('input') input: CustomMoleculeItemInput
    ) {
        return this.service.addToCollection(userId, collectionId, input);
    }

    @Mutation(() => CustomMoleculeItemEntity)
    async updateCustomMolecule(
        @AuthenticatedUserId() userId: UUID,
        @Args('id', { type: () => ID }) id: UUID,
        @Args('input') input: CustomMoleculeItemInput,
        @Info() info: GraphQLResolveInfo
    ) {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.service.update(userId, id, input, fieldsMap);
    }

    @Mutation(() => Boolean)
    async removeCustomMoleculeFromCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('itemId', { type: () => ID }) itemId: UUID
    ) {
        return this.service.removeFromCollection(userId, collectionId, itemId)
    }
}
