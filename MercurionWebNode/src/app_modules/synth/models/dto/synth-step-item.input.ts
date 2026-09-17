import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, ValidateIf } from 'class-validator';
import { UUID } from 'crypto';
import { IsMercurionPublicId } from 'src/identifiers/mercurion-public-id';
import { SynthStepItemKind } from '../enums/synth-step-item-kind.enum';
import { SynthStepItemPosition } from '../enums/synth-step-item-position.enum';

@InputType()
export class SynthStepItemInput {

    @IsMercurionPublicId()
    @Field(() => ID)
    stepId!: UUID

    @ValidateIf(input => !input.text)
    @IsMercurionPublicId()
    @IsOptional()
    @Field(() => ID, { nullable: true })
    poolMoleculeId?: UUID | null

    @ValidateIf(input => !input.poolMoleculeId)
    @IsString()
    @IsOptional()
    @Field(() => String, { nullable: true })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    text?: string | null

    @IsEnum(SynthStepItemKind)
    @Field(() => SynthStepItemKind)
    kind!: SynthStepItemKind

    @IsEnum(SynthStepItemPosition)
    @Field(() => SynthStepItemPosition)
    position!: SynthStepItemPosition

    @IsInt()
    @Min(0)
    @Field(() => Int)
    order!: number
}
