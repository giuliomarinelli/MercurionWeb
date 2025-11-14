import { Field, ID, InputType } from "@nestjs/graphql";
import { IsInt, IsString } from "class-validator";

@InputType()
export class AddManyChEMBLItemDTO {

    @IsInt()
    @Field(() => ID)
    chemblMolregno: number

    @IsString()
    @Field(() => String)
    name: string

}
