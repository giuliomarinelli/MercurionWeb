import { IsOptional, IsString, Matches } from "class-validator"

export class ChangePasswordDTO {
    @IsString()
    @IsOptional()
    oldPassword?: string

    @IsString()
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/)
    newPassword: string
}