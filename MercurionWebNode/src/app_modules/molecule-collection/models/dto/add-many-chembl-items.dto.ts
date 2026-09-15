import { Field, ID, InputType } from "@nestjs/graphql";
import { Transform } from "class-transformer";
import { IsInt, IsString } from "class-validator";
import { GeneralUtils } from "src/utils/general-utils/general-utils";

@InputType()
export class AddManyChEMBLItemDTO {

    @IsInt()
    @Field(() => ID)
    chemblMolregno: number

    @IsString()
    @Field(() => String)
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
    name: string

}
