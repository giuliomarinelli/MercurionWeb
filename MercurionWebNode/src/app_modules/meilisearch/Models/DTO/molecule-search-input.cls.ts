import { InputType, Field, Int, Float } from '@nestjs/graphql';

@InputType()
export class MoleculeSearchInput {
  @Field({ nullable: true })
  query?: string // stringa full-text su nome, synonym, smiles ecc.

  @Field(() => Int, { nullable: true })
  maxPhase?: number

  @Field({ nullable: true })
  moleculeType?: string

  @Field(() => Float, { nullable: true })
  minMw?: number

  @Field(() => Float, { nullable: true })
  maxMw?: number

  @Field(() => Int, { nullable: true })
  limit?: number // default 10
}
