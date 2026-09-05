import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import {
    BeforeInsert,
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    OneToMany,
    PrimaryColumn,
    Unique
} from 'typeorm';
import { CustomMoleculeItemEntity } from '../../../molecule-collection/Models/entities/custom-molecule-item.entity';
import { SynthStepItem } from './synth-step-item.entity';
import { Synthesis } from './synthesis.entity';

@ObjectType()
@Entity('synthesis_pool_molecules')
@Unique('uq_synthesis_pool_molecule', ['synthesisId', 'moleculeId'])
export class SynthesisPoolMolecule {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Index()
    @Column({ name: 'user_id', type: 'uuid' })
    userId: UUID

    @ManyToOne(() => Synthesis, synthesis => synthesis.poolMolecules, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'synthesis_id' })
    synthesis: Synthesis

    @Field(() => ID)
    @Index()
    @Column({ name: 'synthesis_id', type: 'uuid' })
    synthesisId: UUID

    @Field(() => CustomMoleculeItemEntity)
    @ManyToOne(() => CustomMoleculeItemEntity, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'molecule_id' })
    molecule: CustomMoleculeItemEntity

    @Field(() => ID)
    @Index()
    @Column({ name: 'molecule_id', type: 'uuid' })
    moleculeId: UUID

    @OneToMany(() => SynthStepItem, item => item.poolMolecule)
    stepItems: SynthStepItem[]

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }
}
