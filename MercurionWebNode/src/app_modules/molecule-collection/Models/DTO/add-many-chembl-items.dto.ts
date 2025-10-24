import { Field, ID, InputType } from "@nestjs/graphql";

@InputType()
export class AddManyChEMBLItemsDTO {

    @Field(() => ID)
    chemblMolregno: number
    
    @Field(() => String)
    name: string

}