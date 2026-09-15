import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UUID } from 'crypto';
import { AuthenticatedUserId } from '../../../metadata/metadata';
import { assertMercurionPublicId } from '../../../identifiers/mercurion-public-id';
import { SynthesisPoolInput } from '../models/dto/synthesis-pool.input';
import { Synthesis } from '../models/entities/synthesis.entity';
import { SynthesisPoolService } from '../services/synthesis-pool.service';

@Resolver(() => Synthesis)
export class SynthesisPoolResolver {

    constructor(private readonly service: SynthesisPoolService) { }

    @Mutation(() => Synthesis)
    async configureSynthesisPool(
        @Args('input') input: SynthesisPoolInput,
        @AuthenticatedUserId() userId: UUID
    ) {
        assertMercurionPublicId(input.synthesisId, 'synthesisId')
        for (const collectionId of input.collectionIds) {
            assertMercurionPublicId(collectionId, 'collectionId')
        }
        for (const moleculeId of input.moleculeIds) {
            assertMercurionPublicId(moleculeId, 'moleculeId')
        }
        return this.service.configure(userId, input)
    }
}
