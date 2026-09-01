import { Transform } from 'class-transformer'
import { IsEnum, IsOptional, IsString, MaxLength, IsArray, ArrayMaxSize } from 'class-validator'
import { GeneralUtils } from 'src/utils/general-utils/general-utils'
import { FeedbackStatus } from '../enums/feedback.enums'
import type { UpdateFeedbackDTO as UpdateFeedbackContract } from '@mercurion/rest-contracts'

export class UpdateFeedbackDTO implements UpdateFeedbackContract {
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
  internalNote?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @Transform(({ value }) => Array.isArray(value) ? value.map((v) => typeof v === 'string' ? v.trim() : v) : value)
  tags?: string[]
}
