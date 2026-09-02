import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength } from "class-validator";
import type { SmilesDTO as SmilesContract } from '@mercurion/rest-contracts'

export class SmilesDTO implements SmilesContract {
    @IsString()
    @Matches(/\S/, { message: 'SMILES cannot be empty or whitespace' })
    @MaxLength(1024, { message: 'SMILES too long' }) 
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    smiles: string
}
