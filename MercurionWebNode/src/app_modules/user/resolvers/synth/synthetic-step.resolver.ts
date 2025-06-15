import { Args, ID, Info, Mutation, Query, Resolver } from "@nestjs/graphql";
import { AuthenticatedUserId } from "src/metadata/metadata";
import { UUID } from "crypto";
import { GraphQLResolveInfo } from "graphql";
import { GraphqlUtils } from "src/graphql-utils/graphql-utils";
import { SyntheticStepEntity } from "../../Models/entities/synth/synthetic-step.entity";
import { SyntheticStepService } from "../../services/synth/synthetic-step.service";
import { SyntheticStepInput } from "../../Models/DTO/synth/synthetic-step.input";

@Resolver(() => SyntheticStepEntity)
export class SyntheticStepResolver {

    constructor(private readonly service: SyntheticStepService) { }

    @Query(() => [SyntheticStepEntity])
    async syntheticStepsByRoute(
        @Args('routeId', { type: () => ID }) routeId: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.service.findByRoute(userId, routeId, fieldsMap)
    }

    @Query(() => SyntheticStepEntity, { nullable: true })
    async syntheticStepById(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID,
        @Info() info: GraphQLResolveInfo
    ) {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.service.findOneById(userId, id, fieldsMap)
    }

    @Mutation(() => SyntheticStepEntity)
    async createSyntheticStep(
        @AuthenticatedUserId() userId: UUID,
        @Args('input') input: SyntheticStepInput
    ) {
        return this.service.create(userId, input)
    }

    @Mutation(() => SyntheticStepEntity)
    async updateSyntheticStep(
        @AuthenticatedUserId() userId: UUID,
        @Args('id', { type: () => ID }) id: UUID,
        @Args('input') input: SyntheticStepInput,
        @Info() info: GraphQLResolveInfo
    ) {
        const fieldsMap = GraphqlUtils.getFieldsMap(info)
        return this.service.update(userId, id, input, fieldsMap)
    }

    @Mutation(() => Boolean)
    async deleteSyntheticStep(
        @AuthenticatedUserId() userId: UUID,
        @Args('id', { type: () => ID }) id: UUID
    ) {
        return this.service.delete(userId, id)
    }
}
