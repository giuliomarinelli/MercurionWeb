import { IsNotEmpty, IsString, Matches } from "class-validator";

export class BackupCodeDTO {
@IsString()
@IsNotEmpty()
@Matches(/^[0-9A-Fa-f]{4}(?:-[0-9A-Fa-f]{4}){2}$/)
code: string
}