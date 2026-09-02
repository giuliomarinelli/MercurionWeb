import { IsOptional, IsString, Matches } from "class-validator"
import type { ChangePasswordDTO as ChangePasswordContract } from '@mercurion/rest-contracts'

export class ChangePasswordDTO implements ChangePasswordContract {
    @IsString()
    @IsOptional()
    oldPassword?: string

    @IsString()
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/)
    newPassword: string
}