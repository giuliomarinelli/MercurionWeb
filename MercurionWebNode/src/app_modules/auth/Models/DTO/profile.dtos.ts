import { Transform } from "class-transformer"
import { IsEnum, IsNotEmpty, IsOptional, IsString } from "class-validator"
import { UUID } from "node:crypto"
import { TinyHistoryDTO } from "src/app_modules/history/Models/DTO/history.dto"
import { UserGender } from "src/app_modules/user/Models/enums/user-gender.enum"
import { nullish } from "src/Models/nullish.type"
import { GeneralUtils } from "src/utils/general-utils/general-utils"


export interface ProfileDTO {
    firstName: string
    lastName: string
    gender: UserGender
    job: string | nullish
    obscuredEmail: string
    obscuredPhone: string | null
    avatarId: UUID | null
    recentHistory: TinyHistoryDTO[]
    personalMoleculeCount: number
    chemblMoleculeCount: number
    collectionCount: number
    initials: string
}

export class ProfileRegistryDTO {
   
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

export type ProfileRegistryClientDTO = ProfileRegistryDTO & {
    initials: string
}
