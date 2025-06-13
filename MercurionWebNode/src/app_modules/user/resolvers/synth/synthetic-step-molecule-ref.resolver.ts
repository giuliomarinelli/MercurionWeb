import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UUID } from "crypto";
import { SyntheticStepMoleculeRef } from "../../Models/entities/synth/synthetic-step-molecule-ref.entity";
import { SyntheticStepMoleculeRefService } from "../../services/synth/synthetic-step-molecule-ref.service";
import { SyntheticStepMoleculeRefInput } from "../../Models/DTO/synth/synthetic-step-molecule-ref.input";

@Resolver(() => SyntheticStepMoleculeRef)
export class SyntheticStepMoleculeRefResolver {

    constructor(private readonly service: SyntheticStepMoleculeRefService) { }

    @Query(() => [SyntheticStepMoleculeRef])
    async stepMoleculeRefs(
        @Args('stepId', { type: () => ID }) stepId: UUID
    ) {
        return this.service.findByStep(stepId)
    }

    @Mutation(() => SyntheticStepMoleculeRef)
    async addStepMoleculeRef(
        @Args('input') input: SyntheticStepMoleculeRefInput
    ) {
        return this.service.create(input)
    }

    @Mutation(() => SyntheticStepMoleculeRef)
    async updateStepMoleculeRef(
        @Args('id', { type: () => ID }) id: UUID,
        @Args('input') input: SyntheticStepMoleculeRefInput
    ) {
        return this.service.update(id, input)
    }

    @Mutation(() => Boolean)
    async removeStepMoleculeRef(
        @Args('id', { type: () => ID }) id: UUID
    ) {
        return this.service.delete(id)
    }
}
