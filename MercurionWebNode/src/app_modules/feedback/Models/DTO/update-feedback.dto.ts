import { IsEnum, IsOptional, IsString, MaxLength, IsArray, ArrayMaxSize } from 'class-validator'
import { FeedbackStatus } from '../enums/feedback.enums'


export class UpdateFeedbackDTO {
  @IsOptional()
  @IsEnum(FeedbackStatus)
  status?: FeedbackStatus

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  internalNote?: string

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  tags?: string[]
}
