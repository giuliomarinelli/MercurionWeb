import { InputType, Field, Int, Float } from '@nestjs/graphql';
import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

@InputType()
export class MoleculeSearchInput {
  @IsOptional()
  @IsString()
  @Field({ nullable: true })
  query?: string // stringa full-text su nome, synonym, smiles ecc.

  @IsOptional()
  @IsInt()
  @Field(() => Int, { nullable: true })
  maxPhase?: number

  @IsOptional()
  @IsString()
  @Field({ nullable: true })
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
