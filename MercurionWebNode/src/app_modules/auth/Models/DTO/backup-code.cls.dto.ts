import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, Matches } from "class-validator";
import type { BackupCodeDTO as BackupCodeContract } from '@mercurion/rest-contracts'

export class BackupCodeDTO implements BackupCodeContract {
@IsString()
@IsNotEmpty()
@Matches(/^[0-9A-Fa-f]{4}(?:-[0-9A-Fa-f]{4}){2}$/)
@Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
code: string
}
