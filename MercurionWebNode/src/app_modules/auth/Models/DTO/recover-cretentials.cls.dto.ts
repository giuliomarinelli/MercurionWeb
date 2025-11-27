import { IsEmail, IsString, Matches } from "class-validator";

export class RecoverCredentialsDTO {
    @IsString()
    @IsEmail()
    @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    newEmail: string

    @IsString()
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/)    
    newPassword: string
}