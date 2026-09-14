import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UUID } from 'crypto';
import { AuthenticatedUserId } from '../../../metadata/metadata';
import { GeneralUtils } from '../../../utils/general-utils/general-utils';
import { SynthesisPoolInput } from '../Models/DTO/synthesis-pool.input';
import { Synthesis } from '../Models/entities/synthesis.entity';
import { SynthesisPoolService } from '../services/synthesis-pool.service';

@Resolver(() => Synthesis)
export class SynthesisPoolResolver {

    constructor(private readonly service: SynthesisPoolService) { }

    @Mutation(() => Synthesis)
    async configureSynthesisPool(
        @Args('input') input: SynthesisPoolInput,
        @AuthenticatedUserId() userId: UUID
    ) {
        GeneralUtils.ensureValidUUIDv7(input.synthesisId, 'GraphQLInvalid::Invalid synthesisId')
        for (const collectionId of input.collectionIds) {
            GeneralUtils.ensureValidUUIDv7(collectionId, 'GraphQLInvalid::Invalid collectionId')
        }
        for (const moleculeId of input.moleculeIds) {
            GeneralUtils.ensureValidUUIDv7(moleculeId, 'GraphQLInvalid::Invalid moleculeId')
        }
        return this.service.configure(userId, input)
    }
}
