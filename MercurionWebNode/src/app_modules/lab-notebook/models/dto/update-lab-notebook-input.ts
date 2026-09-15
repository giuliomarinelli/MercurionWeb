import { Field, InputType, PartialType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { CreateLabNotebookInput } from "./create-lab-notebook-input";
import { IsUUID } from "class-validator";

@InputType()
export class UpdateLabNotebookInput extends PartialType(CreateLabNotebookInput) {

    @IsUUID()
    @Field()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    id: string

}
