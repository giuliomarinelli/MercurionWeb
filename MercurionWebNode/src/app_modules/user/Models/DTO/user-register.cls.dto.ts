import { IsEmail, IsOptional, IsString, Matches } from "class-validator"

export class UserRegisterDTO {

    @IsString()
    @IsEmail()
    @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    email: string 

    @IsString()
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/)
    password: string 

    @IsString()
    @Matches(/^[A-ZÀ-Ý][a-zà-ÿ]*(?:\s+[A-ZÀ-Ý][a-zà-ÿ]*)*$/)
    firstName: string

    @IsString()
    @Matches(/^[A-ZÀ-Ý][a-zà-ÿ]*(?:\s+[A-ZÀ-Ý][a-zà-ÿ]*)*$/)
    lastName: string
    
    @IsString()
    @Matches(/^(?:[A-ZÀ-Ý][a-zà-ÿ]*(?:\s+[A-ZÀ-Ý][a-zà-ÿ]*)*)?$/)
    @IsOptional()
    job?: string

}
