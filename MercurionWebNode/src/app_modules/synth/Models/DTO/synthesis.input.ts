import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class SynthesisInput {

    @Field() 
    title: string

    @Field(() => String, { nullable: true }) 
    notes?: string | null
    
}