import { Field, InputType, PartialType } from "@nestjs/graphql";
import { CreateLabNotebookInput } from "./create-lab-notebook-input";
import { IsUUID } from "class-validator";

@InputType()
export class UpdateLabNotebookInput extends PartialType(CreateLabNotebookInput) {

    @IsUUID()
    @Field()
    id: string

}
