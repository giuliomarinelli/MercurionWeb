// CreateMoleculeItemInput
import { InputType, Field } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsInt, IsOptional, IsString } from "class-validator";
import { GeneralUtils } from "src/utils/general-utils/general-utils";

@InputType()
export class CreateMoleculeItemInput {

    @IsString()
    @Field(() => String)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    type: string // 'custom' o 'chembl'

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    canonicalSmiles?: string

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

    @IsOptional()
    @IsInt()
    @Field(() => Number, { nullable: true })
    chemblMolregno?: number

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
}
