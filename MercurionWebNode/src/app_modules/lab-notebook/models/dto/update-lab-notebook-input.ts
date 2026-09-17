import { Field, InputType, PartialType } from "@nestjs/graphql";
import { CreateLabNotebookInput } from "./create-lab-notebook-input";
import { IsMercurionPublicId } from "src/identifiers/mercurion-public-id";

@InputType()
export class UpdateLabNotebookInput extends PartialType(CreateLabNotebookInput) {

    @IsMercurionPublicId()
    @Field()
    id!: string

}
