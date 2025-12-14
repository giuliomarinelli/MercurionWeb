import { Args, ID, Info, Mutation, Query, Resolver } from "@nestjs/graphql";
import { CustomMoleculeItemEntity } from "../Models/entities/custom-molecule-item.entity";
import { CustomMoleculeItemService } from "../services/custom-molecule-item.service";
import { AuthenticatedUserId, Authorization } from "src/metadata/metadata";
import { UUID } from "crypto";
import { CustomMoleculeItemInput } from "../Models/DTO/custom-molecule-item.input";
import { GraphQLResolveInfo } from "graphql";
import { GraphQLUtils } from "src/utils/graphql-utils/graphql-utils";
import { GeneralUtils } from "src/utils/general-utils/general-utils";

@Resolver(() => CustomMoleculeItemEntity)
export class CustomMoleculeItemResolver {

    constructor(private readonly service: CustomMoleculeItemService) { }

    private ensureUuid(value: string, field: string): void {
        GeneralUtils.ensureValidUUIDv7(value, `GraphQLInvalid::Invalid ${field}`)
    }

    @Mutation(() => CustomMoleculeItemEntity)
    async addCustomMoleculeToCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('input') input: CustomMoleculeItemInput,
        @Authorization() accessToken: string
    ) {
        this.ensureUuid(collectionId, 'collectionId')
        return this.service.addToCollection(userId, collectionId, input, accessToken)
    }

    @Mutation(() => Boolean)
    async removeCustomMoleculeFromCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('itemId', { type: () => ID }) itemId: UUID
    ) {
        this.ensureUuid(collectionId, 'collectionId')
        this.ensureUuid(itemId, 'itemId')
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

