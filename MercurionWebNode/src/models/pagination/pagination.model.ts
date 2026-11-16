import { Field, Int, ObjectType } from '@nestjs/graphql'

@ObjectType({ isAbstract: true })
export abstract class PaginatedResponse {
  @Field(() => Int)
  itemCount!: number

  @Field(() => Int)
  totalItems!: number

  @Field(() => Int)
  itemsPerPage!: number

  @Field(() => Int)
  totalPages!: number

  @Field(() => Int)
  currentPage!: number
}
