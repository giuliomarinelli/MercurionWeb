import { Field, InputType } from "@nestjs/graphql";
import { IsOptional, IsString } from "class-validator";

@InputType()
export class SynthesisInput {

    @IsString()
    @Field() 
    title: string

    @IsOptional()
    @IsString()
    @Field(() => String, { nullable: true }) 
    notes?: string | null
    
}
