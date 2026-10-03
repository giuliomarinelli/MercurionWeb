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
import { RealtimeStateSyncService } from "src/app_modules/socket-io/realtime-state-sync.service";




@Resolver(() => ChEMBLMoleculeItemEntity)
export class ChEMBLMoleculeItemResolver {

    constructor(
        private readonly service: ChEMBLMoleculeItemService,
        private readonly stateSync: RealtimeStateSyncService
    ) { }

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
        const item = await this.service.addToCollection(userId, collectionId, chemblMolregno, normalizedLabel, normalizedNotes)
        this.stateSync.publishToUser(userId, {
            kind: 'resource-state-changed',
            domain: 'molecule',
            change: 'created',
            resourceId: item.id
        })
        this.stateSync.publishToUser(userId, {
            kind: 'resource-state-changed',
            domain: 'molecule-collection',
            change: 'content-changed',
            resourceId: collectionId
        })
        return item
    }

    @Mutation(() => Boolean)
    async removeChemblMoleculeFromCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('itemId', { type: () => ID }) itemId: UUID
    ) {
        assertMercurionPublicId(collectionId, 'collectionId')
        assertMercurionPublicId(itemId, 'itemId')
        const removed = await this.service.removeFromCollection(userId, collectionId, itemId)
        if (removed) {
            this.stateSync.publishToUser(userId, {
                kind: 'resource-state-changed',
                domain: 'molecule',
                change: 'content-changed',
                resourceId: itemId
            })
            this.stateSync.publishToUser(userId, {
                kind: 'resource-state-changed',
                domain: 'molecule-collection',
                change: 'content-changed',
                resourceId: collectionId
            })
        }
        return removed
    }

    @Mutation(() => Boolean)
    async addManyChemblItemsToCollection(
        @AuthenticatedUserId() userId: UUID,
        @Args('collectionId', { type: () => ID }) collectionId: UUID,
        @Args('input', { type: () => [AddManyChEMBLItemDTO] }) dtos: AddManyChEMBLItemDTO[]
    ): Promise<boolean> {
        assertMercurionPublicId(collectionId, 'collectionId')
        const added = await this.service.addManyChemblItemsToCollection(userId, collectionId, dtos)
        if (added) {
            this.stateSync.publishToUser(userId, {
                kind: 'resource-state-changed',
                domain: 'molecule',
                change: 'content-changed'
            })
            this.stateSync.publishToUser(userId, {
                kind: 'resource-state-changed',
                domain: 'molecule-collection',
                change: 'content-changed',
                resourceId: collectionId
            })
        }
        return added
    }

}
