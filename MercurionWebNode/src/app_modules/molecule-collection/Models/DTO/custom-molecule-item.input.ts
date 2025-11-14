import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';

@InputType()
export class CustomMoleculeItemInput {

    @IsString()
    @Field(() => String)
    canonicalSmiles: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    label?: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true })
    notes?: string

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
}
