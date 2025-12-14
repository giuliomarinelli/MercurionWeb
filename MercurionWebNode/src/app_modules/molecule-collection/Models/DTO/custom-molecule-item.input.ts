import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';

@InputType()
export class CustomMoleculeItemInput {

    @IsString()
    @Field(() => String)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    canonicalSmiles: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
    label?: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    notes?: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    molFormula?: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
    name?: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    propertiesJson?: string
}
