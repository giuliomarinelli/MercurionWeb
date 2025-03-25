import { IsString, Matches } from "class-validator";

export class SmilesDTO {

    @IsString()
    @Matches(/\S/)
    smiles: string

}