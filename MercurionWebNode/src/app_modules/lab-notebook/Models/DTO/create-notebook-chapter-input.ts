import { Field, InputType } from "@nestjs/graphql";
import { IsString, IsUUID } from "class-validator";

@InputType()
export class CreateChapterInput {
    
    @IsUUID()
    @Field() notebookId: string
    @IsString()
    @Field() title: string
    
}
