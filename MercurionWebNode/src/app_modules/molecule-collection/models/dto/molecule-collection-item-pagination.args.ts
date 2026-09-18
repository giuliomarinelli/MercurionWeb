import { ArgsType, Field, ID } from '@nestjs/graphql'
import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { UUID } from 'crypto'
import { PaginationArgs } from 'src/models/pagination/pagination.args'

@ArgsType()
export class MoleculeItemsByUserArgs extends PaginationArgs {
  @Field(() => String)
  @IsString()
  q!: string

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  excludeJoinedToCollection?: boolean | null

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  collectionId?: UUID | null
}

@ArgsType()
export class MoleculeItemsByCollectionArgs extends PaginationArgs {
  @Field(() => String)
  @IsString()
  q!: string

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  excluded?: boolean | null

  @Field(() => String)
  @IsString()
  collectionId!: UUID
}
