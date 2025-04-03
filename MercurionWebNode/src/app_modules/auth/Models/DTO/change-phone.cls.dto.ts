import { IsString, Matches } from "class-validator";

export class ChangePhoneDTO {

    @IsString()
    @Matches(/^\+\d{1,3}$/)
    internationalPrefix: string

    @IsString()
    @Matches(/^\d{6,15}$/)
    phoneNumber: string

}