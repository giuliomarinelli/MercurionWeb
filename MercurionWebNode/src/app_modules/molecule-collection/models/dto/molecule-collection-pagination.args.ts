import { ArgsType, Field, ID } from '@nestjs/graphql'
import { IsBoolean, IsOptional, IsString } from 'class-validator'
import { PaginationArgs } from 'src/models/pagination/pagination.args'

@ArgsType()
export class MoleculeCollectionPaginationArgs extends PaginationArgs {
  @Field(() => String)
  @IsString()
  q!: string

  @Field(() => Boolean, { nullable: true })
  @IsOptional()
  @IsBoolean()
  excludeJoinedToMolecule?: boolean | null

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  moleculeId?: string | null
}
