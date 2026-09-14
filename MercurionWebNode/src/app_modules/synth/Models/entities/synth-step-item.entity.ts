import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import {
    BeforeInsert,
    Column,
    Entity,
    Index,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    Unique
} from 'typeorm';
import { SynthStepItemKind } from '../enums/synth-step-item-kind.enum';
import { SynthStepItemPosition } from '../enums/synth-step-item-position.enum';
import { SynthStep } from './synth-step.entity';
import { SynthesisPoolMolecule } from './synthesis-pool-molecule.entity';

@ObjectType()
@Entity('synth_step_items')
@Unique('uq_synth_step_item_position_order', ['stepId', 'position', 'order'])
export class SynthStepItem {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Index()
    @Column({ name: 'user_id', type: 'uuid' })
    userId: UUID

    @Field(() => SynthStep)
    @ManyToOne(() => SynthStep, step => step.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'step_id' })
    step: SynthStep

    @Field(() => ID)
    @Index()
    @Column({ name: 'step_id', type: 'uuid' })
    stepId: UUID

    @Field(() => SynthesisPoolMolecule, { nullable: true })
    @ManyToOne(() => SynthesisPoolMolecule, poolMolecule => poolMolecule.stepItems, {
        nullable: true,
        onDelete: 'RESTRICT'
    })
    @JoinColumn({ name: 'pool_molecule_id' })
    poolMolecule: SynthesisPoolMolecule | null

    @Field(() => ID, { nullable: true })
    @Index()
    @Column({ name: 'pool_molecule_id', type: 'uuid', nullable: true })
    poolMoleculeId: UUID | null

    @Field(() => String, { nullable: true })
    @Column({ type: 'text', nullable: true })
    text: string | null

    @Field(() => SynthStepItemKind)
    @Column({ type: 'varchar' })
    kind: SynthStepItemKind

    @Field(() => SynthStepItemPosition)
    @Column({ type: 'varchar' })
    position: SynthStepItemPosition

    @Field(() => Int)
    @Column({ name: 'item_order', type: 'int' })
    order: number

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }
}
