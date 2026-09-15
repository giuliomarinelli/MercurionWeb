import { Transform } from "class-transformer";
import { IsDefined, IsNotEmpty, IsString } from "class-validator";
import type { RecoveryCodeDTO as RecoveryCodeContract } from '@mercurion/rest-contracts'

export class RecoveryCodeDTO implements RecoveryCodeContract {
    @IsString()
    @IsDefined()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    code: string
}
