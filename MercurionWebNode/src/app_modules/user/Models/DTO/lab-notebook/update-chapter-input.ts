import { Field, ID, InputType, Int } from "@nestjs/graphql";

@InputType()
export class UpdateChapterInput {
    
    @Field(() => ID) 
    id: string
    
    @Field({ nullable: true }) 
    title?: string
    
    @Field(() => Int, { nullable: true }) 
    order?: number
    
}