import { Args, ID, Info, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ChEMBLMoleculeItemEntity } from "../Models/entities/chembl-molecule-item.entity";
import { ChEMBLMoleculeItemService } from "../services/chembl-molecule-item.service";
import { AuthenticatedUserId } from "src/metadata/metadata";
import { UUID } from "crypto";
import { GraphQLResolveInfo } from 'graphql';
import { GraphqlUtils } from "src/utils/graphql-utils/graphql-utils";
import { AddManyChEMBLItemDTO } from "../Models/DTO/add-many-chembl-items.dto";




@Resolver(() => ChEMBLMoleculeItemEntity)
export class ChEMBLMoleculeItemResolver {

    constructor(private readonly service: ChEMBLMoleculeItemService) { }

    @Query(() => [ChEMBLMoleculeItemEntity])
    async chemblMoleculesByCollection(
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.service.findByCollection(collectionId, userId, fieldsMap)
    }

    @Query(() => ChEMBLMoleculeItemEntity, { nullable: true })
    findOneChemblMoleculeById(
        @Args('itemId', { type: () => ID }) itemId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<ChEMBLMoleculeItemEntity | null> {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.service.findOneById(itemId, userId, fieldsMap)
    }

    @Query(() => String, { nullable: true })
    async hasUserChEMBLMoleculeByMolregnoThenGetUUID(
        @AuthenticatedUserId() userId: UUID,
        @Args('molregno', { type: () => Int }) molregno: number
    ): Promise<string | null> {
        return this.service.hasUserChEMBLMoleculeByMolregnoThenGetUUID(userId, molregno)
    }

    @Query(() => String, { nullable: true })
    async existsChEMBLMoleculeByUUIDThenGetMolregno(
        @AuthenticatedUserId() userId: UUID,
        @Args('_uuid_', { type: () => String }) _uuid_: UUID
    ): Promise<string | null> {
        return this.service.existsChEMBLMoleculeByUUIDThenGetMolregno(userId, _uuid_)
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

    @Mutation(() => Boolean)
    async addManyChemblItemsToCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('input', { type: () => [AddManyChEMBLItemDTO] }) dtos: AddManyChEMBLItemDTO[]
    ): Promise<boolean> {
        return this.service.addManyChemblItemsToCollection(userId, collectionId, dtos)
    }

}
