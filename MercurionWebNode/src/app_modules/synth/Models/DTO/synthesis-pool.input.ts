import { Field, ID, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';
import { UUID } from 'crypto';

@InputType()
export class SynthesisPoolInput {

    @IsUUID()
    @Field(() => ID)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    synthesisId: UUID

    @IsArray()
    @ArrayUnique()
    @IsUUID(undefined, { each: true })
    @Field(() => [ID])
    @Transform(({ value }) => Array.isArray(value)
        ? value.map(item => typeof item === 'string' ? item.trim() : item)
        : value)
    collectionIds: UUID[]

    @IsArray()
    @ArrayUnique()
    @IsUUID(undefined, { each: true })
    @Field(() => [ID])
    @Transform(({ value }) => Array.isArray(value)
        ? value.map(item => typeof item === 'string' ? item.trim() : item)
        : value)
    moleculeIds: UUID[]
}
