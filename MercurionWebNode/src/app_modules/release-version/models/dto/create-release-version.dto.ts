import {
    IsEnum,
    IsInt,
    Min,
    Max,
    IsString,
    Matches,
    IsOptional,
    IsBoolean,
    ValidateNested,
    IsArray,
    ArrayMaxSize,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ReleaseContext } from '../enums/release-context.enum'
import type { ReleaseNote } from './release-note.dtos'


export class CreateReleaseVersionDTO {

    @IsEnum(ReleaseContext)
    context: ReleaseContext

    @IsInt()
    @Min(0)
    @Max(99)
    major: number

    @IsInt()
    @Min(0)
    @Max(999)
    minor: number

    @IsString()
    @Matches(/^[0-9a-fA-F]{7,40}$/)
    commitId: string

    @IsOptional()
    @IsBoolean()
    isHotfix?: boolean

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(50)
    @ValidateNested({ each: true })
    @Type(() => Object) // ReleaseNote is an interface, so use Object as runtime type
    releaseNotes?: ReleaseNote[]
    
}
