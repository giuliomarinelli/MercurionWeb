import { Transform } from "class-transformer"
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator"
import { UserGender } from "src/app_modules/user/Models/enums/user-gender.enum"
import { GeneralUtils } from "src/utils/general-utils/general-utils"
import type {
    ProfileDTO,
    ProfileRegistryClientDTO,
    ProfileRegistryDTO as ProfileRegistryContract
} from '@mercurion/rest-contracts'

export type { ProfileDTO, ProfileRegistryClientDTO }

export class ProfileRegistryDTO implements ProfileRegistryContract {
   
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizePersonName(value) : value)
    firstName: string

    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizePersonName(value) : value)
    lastName: string

    @IsEnum(UserGender)
    gender: UserGender

    @IsString()
    @IsNotEmpty()
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
    job?: string | null

}
