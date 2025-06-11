import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { BeforeInsert, Column, Entity, ManyToOne, PrimaryColumn, JoinColumn } from 'typeorm';
import { SyntheticStepEntity } from './synthetic-step.entity';
import { MoleculeCollectionItemEntity } from '../molecule-collection/molecule-collection-item.entity';


@Entity('synthetic_step_molecule_refs')
export class SyntheticStepMoleculeRef {
    
    @PrimaryColumn({ type: 'uuid' })
    id: UUID;

    @ManyToOne(() => SyntheticStepEntity, step => step.moleculeRefs)
    @JoinColumn({ name: 'step_id' })
    step: SyntheticStepEntity

    @ManyToOne(() => MoleculeCollectionItemEntity)
    @JoinColumn({ name: 'molecule_id' })
    molecule: MoleculeCollectionItemEntity

    @Column({ type: 'varchar' })
    role: 'reactant' | 'product' | 'reagent' // Differenzia tipo partecipante nella reazione

    @Column({ type: 'varchar', nullable: true })
    alias: string | null // Etichetta visuale ("A", "B", ecc.)

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }

}
