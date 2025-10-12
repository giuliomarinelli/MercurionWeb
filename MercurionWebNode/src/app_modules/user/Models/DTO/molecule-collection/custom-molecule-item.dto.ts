import { Field, ID, ObjectType } from "@nestjs/graphql";
import { MoleculeCollectionItemJoin } from "../../entities/molecule-collection/molecule-collection-item-join.entity";

@ObjectType()
export class CustomMoleculeItemDTO {

  @Field(() => ID)
  id: string

  @Field({ nullable: true })
  label?: string

  @Field({ nullable: true })
  notes?: string

  @Field()
  type: string// 'custom'

  @Field(() => String, { nullable: true })
  canonicalSmiles: string

  @Field({ nullable: true })
  molFormula?: string

  @Field({ nullable: true })
  name?: string

  @Field({ nullable: true })
  propertiesJson?: string

  @Field(() => String)
  createdAt: number

  @Field(() => String)
  updatedAt: number
  
  @Field(() => String)
  touchedAt: number

  @Field(() => [MoleculeCollectionItemJoin], { nullable: true })
  joins: MoleculeCollectionItemJoin[] | null


}