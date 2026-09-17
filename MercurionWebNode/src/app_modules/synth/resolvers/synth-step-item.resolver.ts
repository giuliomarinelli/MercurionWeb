import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UUID } from 'crypto';
import { AuthenticatedUserId } from '../../../metadata/metadata';
import { assertMercurionPublicId } from '../../../identifiers/mercurion-public-id';
import { SynthStepItemInput } from '../models/dto/synth-step-item.input';
import { SynthStepItem } from '../models/entities/synth-step-item.entity';
import { SynthStepItemService } from '../services/synth-step-item.service';

@Resolver(() => SynthStepItem)
export class SynthStepItemResolver {

    constructor(private readonly service: SynthStepItemService) { }

    @Query(() => [SynthStepItem])
    async synthStepItems(
        @Args('stepId', { type: () => ID }) stepId: UUID,
        @AuthenticatedUserId() userId: UUID
    ) {
        assertMercurionPublicId(stepId, 'stepId')
        return this.service.findByStep(stepId, userId)
    }

    @Mutation(() => SynthStepItem)
    async addSynthStepItem(
        @Args('input') input: SynthStepItemInput,
        @AuthenticatedUserId() userId: UUID
    ) {
        this.validateInputIds(input)
        return this.service.create(userId, input)
    }

    @Mutation(() => SynthStepItem)
    async updateSynthStepItem(
        @Args('id', { type: () => ID }) id: UUID,
        @Args('input') input: SynthStepItemInput,
        @AuthenticatedUserId() userId: UUID
    ) {
        assertMercurionPublicId(id, 'id')
        this.validateInputIds(input)
        return this.service.update(id, userId, input)
    }

    @Mutation(() => Boolean)
    async removeSynthStepItem(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID
    ) {
        assertMercurionPublicId(id, 'id')
        return this.service.delete(id, userId)
    }

    private validateInputIds(input: SynthStepItemInput): void {
        assertMercurionPublicId(input.stepId, 'stepId')
        if (input.poolMoleculeId) {
            assertMercurionPublicId(input.poolMoleculeId, 'poolMoleculeId')
        }
    }
}
