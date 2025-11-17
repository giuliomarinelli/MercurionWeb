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

    @Column({ type: 'varchar' })
    name: string | null

    @Column({ type: 'varchar' })
    nameEn

}
