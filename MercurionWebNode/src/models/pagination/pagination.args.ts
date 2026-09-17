import { ArgsType, Field, Int } from '@nestjs/graphql'
import { IsInt, Max, Min } from 'class-validator'

export const PAGINATION_DEFAULT_PAGE = 1
export const PAGINATION_DEFAULT_LIMIT = 20
export const PAGINATION_MAX_LIMIT = 100

@ArgsType()
export class PaginationArgs {
  @Field(() => Int, { defaultValue: PAGINATION_DEFAULT_PAGE })
  @IsInt()
  @Min(1)
  page = PAGINATION_DEFAULT_PAGE

  @Field(() => Int, { defaultValue: PAGINATION_DEFAULT_LIMIT })
  @IsInt()
  @Min(1)
  @Max(PAGINATION_MAX_LIMIT)
  limit = PAGINATION_DEFAULT_LIMIT
}
