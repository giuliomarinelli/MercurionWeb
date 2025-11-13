import { Field, InputType } from "@nestjs/graphql";

@InputType()
export class CreateLabNotebookInput {

    @Field()
    title: string

}