import { IsString, Matches } from 'class-validator'

export class Login_SecondStepDTO {

    @IsString()
    @Matches(/^(\d{6}|[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4})$/, {
        message: 'Invalid TOTP code format'
    })
    totp: string

}
