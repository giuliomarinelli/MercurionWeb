import { IsEmail, IsString, Matches } from "class-validator";

export class ChangeEmailDTO {

    @IsString()
    @IsEmail()
    @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    email: string

}