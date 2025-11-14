// CreateMoleculeItemInput
import { InputType, Field } from "@nestjs/graphql";
import { IsInt, IsOptional, IsString } from "class-validator";

@InputType()
export class CreateMoleculeItemInput {

    @IsString()
    @Field(() => String)
    type: string // 'custom' o 'chembl'

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    canonicalSmiles?: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    molFormula?: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    name?: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    propertiesJson?: string

    @IsOptional()
    @IsInt()
    @Field(() => Number, { nullable: true })
    chemblMolregno?: number

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    label?: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    notes?: string
}
