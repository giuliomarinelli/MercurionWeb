import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UUID } from "crypto";
import { SynthStepMoleculeRef } from "../Models/entities/synth-step-molecule-ref.entity";
import { SynthStepMoleculeRefService } from "../services/synth-step-molecule-ref.service";
import { SynthStepMoleculeRefInput } from "../Models/DTO/synth-step-molecule-ref.input";
import { AuthenticatedUserId } from "src/metadata/metadata";
import { GeneralUtils } from "src/utils/general-utils/general-utils";

@Resolver(() => SynthStepMoleculeRef)
export class SyntheticStepMoleculeRefResolver {

    constructor(private readonly service: SynthStepMoleculeRefService) { }

    private ensureUuid(value: string, field: string): void {
        GeneralUtils.ensureValidUUIDv7(value, `GraphQLInvalid::Invalid ${field}`)
    }

    @Query(() => [SynthStepMoleculeRef])
    async stepMoleculeRefs(
        @Args('stepId', { type: () => ID }) stepId: UUID,
        @AuthenticatedUserId() userId: UUID
    ) {
        this.ensureUuid(stepId, 'stepId')
        return this.service.findByStep(stepId, userId)
    }

    @Mutation(() => SynthStepMoleculeRef)
    async addStepMoleculeRef(
        @Args('input') input: SynthStepMoleculeRefInput,
        @AuthenticatedUserId() userId: UUID
    ) {
        this.ensureUuid(input.stepId, 'stepId')
        this.ensureUuid(input.moleculeId, 'moleculeId')
        return this.service.create(userId, input)
    }

    @Mutation(() => SynthStepMoleculeRef)
    async updateStepMoleculeRef(
        @Args('id', { type: () => ID }) id: UUID,
        @Args('input') input: SynthStepMoleculeRefInput,
        @AuthenticatedUserId() userId: UUID
    ) {
        this.ensureUuid(id, 'id')
        this.ensureUuid(input.stepId, 'stepId')
        this.ensureUuid(input.moleculeId, 'moleculeId')
        return this.service.update(id, userId, input)
    }

    @Mutation(() => Boolean)
    async removeStepMoleculeRef(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID
    ) {
        this.ensureUuid(id, 'id')
        return this.service.delete(id, userId)
    }
}
