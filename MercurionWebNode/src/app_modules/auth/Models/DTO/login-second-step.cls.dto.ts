import { IsObject, IsString, Matches } from 'class-validator'
import { ChangePhoneDTO } from './change-phone.cls.dto'

export class LoginStep2DTO {

    @IsString()
    @Matches(/^(\d{6}|[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4})$/, {
        message: 'Invalid TOTP code format'
    })
    totp: string

    @IsString()
    @Matches(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
    secureToken: string

    @IsObject()
    phoneNumber?: ChangePhoneDTO

}
