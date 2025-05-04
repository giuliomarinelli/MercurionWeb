import { ChildEntity, Column } from 'typeorm';
import { MoleculeCollectionItemEntity } from './molecule-collection-item.entity';

@ChildEntity('chembl')
export class ChEMBLMoleculeItemEntity extends MoleculeCollectionItemEntity {

    @Column({ type: 'bigint' })
    chemblMolregno: number

}
