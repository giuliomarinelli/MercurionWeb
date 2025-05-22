import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class NotebookChapterType {
   
    @Field(() => ID) 
    id: string
   
    @Field() 
    userId: string
   
    @Field() 
    title: string
   
    @Field(() => Int) 
    order: number
   
    @Field(() => [String], { nullable: true }) 
    sectionIds?: string[]
   
    @Field(() => String, { nullable: true }) 
    createdAt?: string
   
    @Field(() => String, { nullable: true }) 
    updatedAt?: string
    
}