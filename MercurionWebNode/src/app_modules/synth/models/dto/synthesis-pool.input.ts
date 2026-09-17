import { Field, ID, InputType } from '@nestjs/graphql';
import { ArrayUnique, IsArray } from 'class-validator';
import { UUID } from 'crypto';
import { IsMercurionPublicId } from 'src/identifiers/mercurion-public-id';

@InputType()
export class SynthesisPoolInput {

    @IsMercurionPublicId()
    @Field(() => ID)
    synthesisId!: UUID

    @IsArray()
    @ArrayUnique()
    @IsMercurionPublicId({ each: true })
    @Field(() => [ID])
    collectionIds!: UUID[]

    @IsArray()
    @ArrayUnique()
    @IsMercurionPublicId({ each: true })
    @Field(() => [ID])
    moleculeIds!: UUID[]
}
