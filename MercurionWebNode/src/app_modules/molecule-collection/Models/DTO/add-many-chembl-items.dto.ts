import { Field, ID, InputType } from "@nestjs/graphql";

@InputType()
export class AddManyChEMBLItemDTO {

    @Field(() => ID)
    chemblMolregno: number

    @Field(() => String)
    name: string

}