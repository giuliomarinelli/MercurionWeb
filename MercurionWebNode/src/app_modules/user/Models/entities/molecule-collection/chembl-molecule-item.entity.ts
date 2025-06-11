import { ChildEntity, Column, Index } from 'typeorm';
import { MoleculeCollectionItemEntity } from './molecule-collection-item.entity';

@ChildEntity('chembl')
export class ChEMBLMoleculeItemEntity extends MoleculeCollectionItemEntity {

    @Index()
    @Column({ type: 'bigint' })
    chemblMolregno: number

}
