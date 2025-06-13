import { Args, ID, Info, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ChEMBLMoleculeItemEntity } from "../../Models/entities/molecule-collection/chembl-molecule-item.entity";
import { ChEMBLMoleculeItemService } from "../../services/molecule-collection/chembl-molecule-item.service";
import { AuthenticatedUserId } from "src/metadata/metadata";
import { UUID } from "crypto";
import { GraphQLResolveInfo } from 'graphql';
import { GraphqlUtils } from "src/graphql-utils/graphql-utils";




@Resolver(() => ChEMBLMoleculeItemEntity)
export class ChEMBLMoleculeItemResolver {

    constructor(private readonly service: ChEMBLMoleculeItemService) { }

    @Query(() => ChEMBLMoleculeItemEntity, { nullable: true })
    findOneChemblMoleculeById(
        @Args('itemId', { type: () => ID }) itemId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<ChEMBLMoleculeItemEntity | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.service.findOneById(itemId, userId, fieldsMap)
    }

    @Query(() => [ChEMBLMoleculeItemEntity])
    async chemblMoleculesByCollection(
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.service.findByCollection(collectionId, userId, fieldsMap)
    }

    @Mutation(() => ChEMBLMoleculeItemEntity)
    async addChemblMoleculeToCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('chemblMolregno', { type: () => Number }) chemblMolregno: number,
        @Args('label', { nullable: true }) label?: string,
        @Args('notes', { nullable: true }) notes?: string,
    ) {
        return this.service.addToCollection(userId, collectionId, chemblMolregno, label, notes)
    }

    @Mutation(() => Boolean)
    async removeChemblMoleculeFromCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('itemId', { type: () => ID }) itemId: UUID
    ) {
        return this.service.removeFromCollection(userId, collectionId, itemId)
    }

}
