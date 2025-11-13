import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class CreateChapterInput {
    
    @Field() notebookId: string
    @Field() title: string
    
}