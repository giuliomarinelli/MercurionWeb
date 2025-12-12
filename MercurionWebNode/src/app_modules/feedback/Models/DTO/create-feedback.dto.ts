import {
    IsEnum,
    IsInt,
    Min,
    Max,
    IsOptional,
    IsString,
    IsNotEmpty,
    MaxLength,
    ValidateIf,
    IsObject
} from 'class-validator'

import {
    FeedbackEnv,
    FeedbackSource,
    FeedbackKind,
    FeedbackContextKind
} from '../enums/feedback.enums'

export class CreateFeedbackDTO {
    @IsEnum(FeedbackEnv)
    env: FeedbackEnv

    @IsOptional()
    @IsEnum(FeedbackSource)
    source?: FeedbackSource

    @IsOptional()
    @IsEnum(FeedbackKind)
    kind?: FeedbackKind

    @IsOptional()
    @IsEnum(FeedbackContextKind)
    contextKind?: FeedbackContextKind

    @IsOptional()
    @IsString()
    @MaxLength(256)
    contextRef?: string

    @IsOptional()
    @IsObject()
    contextMeta?: Record<string, unknown>

    @IsOptional()
    @IsString()
    @MaxLength(64)
    clientVersion?: string

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    ratingUtility?: number

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    ratingClarity?: number

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    ratingExperience?: number

    @IsOptional()
    @IsString()
    @MaxLength(4000)
    message?: string

    // policy: almeno uno tra message o rating*
    @ValidateIf(o =>
        !o.message &&
        o.ratingUtility == null &&
        o.ratingClarity == null &&
        o.ratingExperience == null
    )
    @IsNotEmpty()
    _nonEmptyGuard?: string
}
