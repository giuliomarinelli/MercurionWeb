import { Field, InputType, PartialType } from "@nestjs/graphql";
import { CreateLabNotebookInput } from "./create-lab-notebook-input";

@InputType()
export class UpdateLabNotebookInput extends PartialType(CreateLabNotebookInput) {

    @Field()
    id: string

}