import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength } from "class-validator";

export class SmilesDTO {
    @IsString()
    @Matches(/\S/, { message: 'SMILES cannot be empty or whitespace' })
    @MaxLength(1024, { message: 'SMILES too long' }) 
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    smiles: string
}
