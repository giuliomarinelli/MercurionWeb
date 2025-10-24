import { IsNotEmpty, IsNumber, IsString, Min } from "class-validator";

export class AddManyChEMBLItemsDTO {

    @IsNumber()
    @Min(1)
    @IsNotEmpty()
    chemblMolregno: number

    @IsString()
    @IsNotEmpty()
    name: string

}