import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UUID } from 'crypto';
import { AuthenticatedUserId } from '../../../metadata/metadata';
import { GeneralUtils } from '../../../utils/general-utils/general-utils';
import { SynthStepItemInput } from '../Models/DTO/synth-step-item.input';
import { SynthStepItem } from '../Models/entities/synth-step-item.entity';
import { SynthStepItemService } from '../services/synth-step-item.service';

@Resolver(() => SynthStepItem)
export class SynthStepItemResolver {

    constructor(private readonly service: SynthStepItemService) { }

    private ensureUuid(value: string, field: string): void {
        GeneralUtils.ensureValidUUIDv7(value, `GraphQLInvalid::Invalid ${field}`)
    }

    @Query(() => [SynthStepItem])
    async synthStepItems(
        @Args('stepId', { type: () => ID }) stepId: UUID,
        @AuthenticatedUserId() userId: UUID
    ) {
        this.ensureUuid(stepId, 'stepId')
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
        this.ensureUuid(id, 'id')
        this.validateInputIds(input)
        return this.service.update(id, userId, input)
    }

    @Mutation(() => Boolean)
    async removeSynthStepItem(
        @Args('id', { type: () => ID }) id: UUID,
        @AuthenticatedUserId() userId: UUID
    ) {
        this.ensureUuid(id, 'id')
        return this.service.delete(id, userId)
    }

    private validateInputIds(input: SynthStepItemInput): void {
        this.ensureUuid(input.stepId, 'stepId')
        if (input.poolMoleculeId) {
            this.ensureUuid(input.poolMoleculeId, 'poolMoleculeId')
        }
    }
}
