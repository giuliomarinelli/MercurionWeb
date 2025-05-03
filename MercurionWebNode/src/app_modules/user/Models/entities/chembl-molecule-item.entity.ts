import { ChildEntity, Column } from 'typeorm';
import { MoleculeCollectionItemEntity } from './molecule-collection-item.entity';

@ChildEntity('chembl')
export class ChEMBLMoleculeItemEntity extends MoleculeCollectionItemEntity {

    @Column()
    chemblMolregno: number

}
