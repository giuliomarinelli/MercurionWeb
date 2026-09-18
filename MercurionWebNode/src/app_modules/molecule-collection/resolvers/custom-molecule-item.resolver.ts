import { Args, ID, Info, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CustomMoleculeItemEntity } from "../models/entities/custom-molecule-item.entity";
import { CustomMoleculeItemService } from "../services/custom-molecule-item.service";
import { AuthenticatedUserId, Authorization } from "src/metadata/metadata";
import { UUID } from "crypto";
import { CustomMoleculeItemInput } from "../models/dto/custom-molecule-item.input";
import { GraphQLResolveInfo } from "graphql";
import { GraphQLUtils } from "src/utils/graphql-utils/graphql-utils";
import { assertMercurionPublicId } from "src/identifiers/mercurion-public-id";

@Resolver(() => CustomMoleculeItemEntity)
export class CustomMoleculeItemResolver {

    constructor(private readonly service: CustomMoleculeItemService) { }

    @Mutation(() => CustomMoleculeItemEntity)
    async addCustomMoleculeToCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('input') input: CustomMoleculeItemInput,
        @Authorization() accessToken: string
    ) {
        assertMercurionPublicId(collectionId, 'collectionId')
        return this.service.addToCollection(userId, collectionId, input, accessToken)
    }

    @Mutation(() => Boolean)
    async removeCustomMoleculeFromCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('itemId', { type: () => ID }) itemId: UUID
    ) {
        assertMercurionPublicId(collectionId, 'collectionId')
        assertMercurionPublicId(itemId, 'itemId')
        return this.service.removeFromCollection(userId, collectionId, itemId)
    }

    @Query(() => CustomMoleculeItemEntity, { nullable: true })
    async findOneCustomMoleculeByCanonicalSmiles(
        @AuthenticatedUserId() userId: UUID,
        @Args('canonicalSmiles', { type: () => String }) cs: string,
        @Info() info: GraphQLResolveInfo
    ): Promise<CustomMoleculeItemEntity | null> {
        const normalizedSmiles = typeof cs === 'string' ? cs.trim() : cs
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.service.findOneByCanonicalSmiles(userId, normalizedSmiles, fieldsMap)
    }

}
