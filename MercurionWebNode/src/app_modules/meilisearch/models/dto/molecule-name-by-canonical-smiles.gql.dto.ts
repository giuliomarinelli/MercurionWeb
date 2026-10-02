import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";

export enum MoleculeNameSource {
  chembl = 'chembl',
  custom = 'custom',
}

registerEnumType(MoleculeNameSource, {
  name: 'MoleculeNameSource',
})

@ObjectType()
export class MoleculeNameByCanonicalSmilesDTO {
    @Field(() => MoleculeNameSource)
    type!: MoleculeNameSource

    @Field(() => String, { nullable: true })
    preferredNameIt!: string | null
}