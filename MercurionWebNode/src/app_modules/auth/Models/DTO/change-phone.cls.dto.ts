import { Transform } from "class-transformer";
import { IsString, Matches } from "class-validator";

export class PhoneDTO {
    @IsString()
    @Matches(/^\d{6,15}$/)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    phoneNumber: string
}

export class ChangePhoneDTO extends PhoneDTO {
    @IsString()
    @Matches(/^\+\d{1,3}$/)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    internationalPrefix: string
}
