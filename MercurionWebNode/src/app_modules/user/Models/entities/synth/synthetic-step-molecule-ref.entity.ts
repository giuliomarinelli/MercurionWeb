import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { BeforeInsert, Column, Entity, ManyToOne, PrimaryColumn, JoinColumn } from 'typeorm';
import { SyntheticStepEntity } from './synthetic-step.entity';
import { MoleculeCollectionItemEntity } from '../molecule-collection/molecule-collection-item.entity';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MoleculeRole } from '../../enums/molecule-role.enum';

@ObjectType()
@Entity('synthetic_step_molecule_refs')
export class SyntheticStepMoleculeRef {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Field(() => SyntheticStepEntity, { nullable: true })
    @ManyToOne(() => SyntheticStepEntity, step => step.moleculeRefs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'step_id' })
    step: SyntheticStepEntity

    @Field(() => MoleculeCollectionItemEntity, { nullable: true })
    @ManyToOne(() => MoleculeCollectionItemEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'molecule_id' })
    molecule: MoleculeCollectionItemEntity

    @Field(() => MoleculeRole)
    @Column({ type: 'varchar' })
    role: MoleculeRole // Differenzia tipo partecipante nella reazione

    @Field(() => String, { nullable: true })
    @Column({ type: 'varchar', nullable: true })
    alias: string | null // Etichetta visuale ("A", "B", ecc.)

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }

}
