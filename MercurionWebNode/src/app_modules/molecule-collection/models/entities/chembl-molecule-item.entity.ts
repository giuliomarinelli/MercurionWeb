import { ChildEntity, Column, Index } from 'typeorm';
import { MoleculeCollectionItemEntity } from './molecule-collection-item.entity';
import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType({ implements: MoleculeCollectionItemEntity })
@ChildEntity('chembl')
export class ChEMBLMoleculeItemEntity extends MoleculeCollectionItemEntity {

    @Field()
    @Index()
    @Column({ type: 'bigint' })
    chemblMolregno: number

    @Field(() => String, { nullable: true })
    @Column({ type: 'varchar' })
    name: string | null

    @Field(() => String, { nullable: true })
    @Column({ type: 'varchar' })
    nameEn: string | null

}
