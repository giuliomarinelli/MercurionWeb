import { IsEmail, IsNotEmpty, IsBoolean, IsString, Matches, IsOptional, IsObject } from 'class-validator'
import { ISessionDeviceInfo } from '../interfaces/i-session.interface'

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

    @IsOptional()
    @IsObject()
    sessionDeviceInfo?: ISessionDeviceInfo

}
