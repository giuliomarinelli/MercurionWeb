import { IsEmail, IsString, Matches } from "class-validator";

export class EmailDTO {

    @IsString()
    @IsEmail()
    @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    email: string

}