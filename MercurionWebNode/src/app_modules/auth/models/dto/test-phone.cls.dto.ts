import { IsOptional, IsString } from "class-validator";

export class TestPhoneDTO {

    @IsOptional()
    @IsString()
    completePhoneNumber?: string

}