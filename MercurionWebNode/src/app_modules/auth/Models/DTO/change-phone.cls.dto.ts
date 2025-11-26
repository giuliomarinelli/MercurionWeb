import { IsString, Matches } from "class-validator";

export class PhoneDTO {
    @IsString()
    @Matches(/^\d{6,15}$/)
    phoneNumber: string
}

export class ChangePhoneDTO extends PhoneDTO {
    @IsString()
    @Matches(/^\+\d{1,3}$/)
    internationalPrefix: string
}
