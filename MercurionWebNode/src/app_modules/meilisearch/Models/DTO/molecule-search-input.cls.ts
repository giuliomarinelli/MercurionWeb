import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';

@InputType()
export class MoleculeSearchInput {
  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  @Transform(({ value }) => typeof value === 'string' ? GeneralUtils.normalizeSpaces(value) : value)
  query?: string // stringa full-text su nome, synonym, smiles ecc.

  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  maxPhase?: number

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  moleculeType?: string

  @IsOptional()
  @IsNumber()
  @Field(() => Float, { nullable: true })
  minMw?: number

  @IsOptional()
  @IsNumber()
  @Field(() => Float, { nullable: true })
  maxMw?: number

  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  limit?: number // default 10
}
