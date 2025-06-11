import { ChildEntity, Column } from 'typeorm';
import { MoleculeCollectionItemEntity } from './molecule-collection-item.entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ implements: MoleculeCollectionItemEntity })
@ChildEntity('custom')
export class CustomMoleculeItemEntity extends MoleculeCollectionItemEntity {

    @Field()
    @Column({ type: 'text' })
    canonicalSmiles: string

    @Field(() => String, { nullable: true })
    @Column({ type: 'text', nullable: true })
    molFormula: string | null

    @Field(() => String, { nullable: true })
    @Column({ type: 'text', nullable: true })
    name: string | null

    @Field(() => String, { nullable: true })
    @Column({ type: 'text', nullable: true })
    propertiesJson: string | null // Salvate come TEXT, ma associate a interfaccia `MoleculeProperties`

}
