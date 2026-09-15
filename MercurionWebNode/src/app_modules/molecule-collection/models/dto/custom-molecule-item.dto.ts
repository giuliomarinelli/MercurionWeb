import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MoleculeCollectionItemJoin } from '../entities/molecule-collection-item-join.entity';

@ObjectType()
export class CustomMoleculeItemDTO {
  @Field(() => ID)
  id: string

  @Field(() => String, { nullable: true })
  label: string | null

  @Field(() => String, { nullable: true })
  notes: string | null

  @Field(() => String)
  type: 'custom'

  @Field(() => String)
  canonicalSmiles: string

  @Field(() => String, { nullable: true })
  molFormula: string | null

  @Field(() => String, { nullable: true })
  name: string | null

  @Field(() => String, { nullable: true })
  propertiesJson: string | null

  @Field(() => String)
  createdAt: number

  @Field(() => String)
  updatedAt: number

  @Field(() => String)
  touchedAt: number

  @Field(() => [MoleculeCollectionItemJoin], { nullable: true })
  joins: MoleculeCollectionItemJoin[] | null
}
