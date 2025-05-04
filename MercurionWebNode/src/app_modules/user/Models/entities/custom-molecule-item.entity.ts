import { ChildEntity, Column } from 'typeorm';
import { MoleculeCollectionItemEntity } from './molecule-collection-item.entity';

@ChildEntity('custom')
export class CustomMoleculeItemEntity extends MoleculeCollectionItemEntity {

    @Column({ type: 'text' })
    canonicalSmiles: string

    @Column({ type: 'text', nullable: true })
    molFormula: string | null

    @Column({ type: 'text', nullable: true })
    name: string | null

    @Column({ type: 'text', nullable: true })
    propertiesJson: string | null // Salvate come TEXT, ma associate a interfaccia `MoleculeProperties`

}
