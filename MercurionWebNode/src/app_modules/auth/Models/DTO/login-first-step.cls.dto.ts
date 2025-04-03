import { IsEmail, IsNotEmpty, IsBoolean, IsString, Matches } from 'class-validator'

export class Login_FirstStepDTO {

    @IsString()
    @IsEmail()
    @Matches(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    email: string

    @IsNotEmpty()
    @IsString()
    password: string

    @IsBoolean()
    remember: boolean

}
