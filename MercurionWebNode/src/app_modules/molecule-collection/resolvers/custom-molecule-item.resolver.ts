import { Args, ID, Mutation, Resolver } from "@nestjs/graphql";
import { CustomMoleculeItemEntity } from "../Models/entities/custom-molecule-item.entity";
import { CustomMoleculeItemService } from "../services/custom-molecule-item.service";
import { AuthenticatedUserId } from "src/metadata/metadata";
import { UUID } from "crypto";
import { CustomMoleculeItemInput } from "../Models/DTO/custom-molecule-item.input";

@Resolver(() => CustomMoleculeItemEntity)
export class CustomMoleculeItemResolver {

    constructor(private readonly service: CustomMoleculeItemService) { }
    
    @Mutation(() => CustomMoleculeItemEntity)
    async addCustomMoleculeToCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('input') input: CustomMoleculeItemInput
    ) {
        return this.service.addToCollection(userId, collectionId, input);
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

