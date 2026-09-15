import { Args, ID, Info, Int, Mutation, Query, Resolver } from "@nestjs/graphql";
import { ChEMBLMoleculeItemEntity } from "../models/entities/chembl-molecule-item.entity";
import { ChEMBLMoleculeItemService } from "../services/chembl-molecule-item.service";
import { AuthenticatedUserId, Public } from "src/metadata/metadata";
import { UUID } from "crypto";
import { GraphQLResolveInfo } from 'graphql';
import { GraphQLUtils } from "src/utils/graphql-utils/graphql-utils";
import { AddManyChEMBLItemDTO } from "../models/dto/add-many-chembl-items.dto";
import { GeneralUtils } from "src/utils/general-utils/general-utils";
import { assertMercurionPublicId } from "src/identifiers/mercurion-public-id";




@Resolver(() => ChEMBLMoleculeItemEntity)
export class ChEMBLMoleculeItemResolver {

    constructor(private readonly service: ChEMBLMoleculeItemService) { }

    @Query(() => [ChEMBLMoleculeItemEntity])
    async chemblMoleculesByCollection(
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        assertMercurionPublicId(collectionId, 'collectionId')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.service.findByCollection(collectionId, userId, fieldsMap)
    }

    @Query(() => ChEMBLMoleculeItemEntity, { nullable: true })
    findOneChemblMoleculeById(
        @Args('itemId', { type: () => ID }) itemId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ): Promise<ChEMBLMoleculeItemEntity | null> {
        assertMercurionPublicId(itemId, 'itemId')
        const fieldsMap = GraphQLUtils.getFieldsMap(info)
        return this.service.findOneById(itemId, userId, fieldsMap)
    }

    @Query(() => String, { nullable: true })
    async hasUserChEMBLMoleculeByMolregnoThenGetUUID(
        @AuthenticatedUserId() userId: UUID,
        @Args('molregno', { type: () => Int }) molregno: number
    ): Promise<string | null> {
        return this.service.hasUserChEMBLMoleculeByMolregnoThenGetUUID(userId, molregno)
    }

    @Public()
    @Query(() => String, { nullable: true })
    async existsChEMBLMoleculeByUUIDThenGetMolregno(        
        @Args('_uuid_', { type: () => String }) _uuid_: UUID
    ): Promise<string | null> {
        return this.service.existsChEMBLMoleculeByUUIDThenGetMolregno(_uuid_)
    }

    @Mutation(() => ChEMBLMoleculeItemEntity)
    async addChemblMoleculeToCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('chemblMolregno', { type: () => Number }) chemblMolregno: number,
        @Args('label', { nullable: true }) label?: string,
        @Args('notes', { nullable: true }) notes?: string,
    ) {
        assertMercurionPublicId(collectionId, 'collectionId')
        const normalizedLabel = typeof label === 'string' ? GeneralUtils.normalizeSpaces(label) : label
        const normalizedNotes = typeof notes === 'string' ? notes.trim() : notes
        return this.service.addToCollection(userId, collectionId, chemblMolregno, normalizedLabel, normalizedNotes)
    }

    @Mutation(() => Boolean)
    async removeChemblMoleculeFromCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('itemId', { type: () => ID }) itemId: UUID
    ) {
        assertMercurionPublicId(collectionId, 'collectionId')
        assertMercurionPublicId(itemId, 'itemId')
        return this.service.removeFromCollection(userId, collectionId, itemId)
    }

    @Mutation(() => Boolean)
    async addManyChemblItemsToCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('input', { type: () => [AddManyChEMBLItemDTO] }) dtos: AddManyChEMBLItemDTO[]
    ): Promise<boolean> {
        assertMercurionPublicId(collectionId, 'collectionId')
        return this.service.addManyChemblItemsToCollection(userId, collectionId, dtos)
    }

}
