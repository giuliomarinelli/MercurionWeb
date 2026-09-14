import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { BeforeInsert, Column, Entity, ManyToOne, PrimaryColumn, OneToMany, JoinColumn, Index, Unique } from 'typeorm';
import { Synthesis } from './synthesis.entity';
import { SynthStepItem } from './synth-step-item.entity';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Entity('synth_steps')
@Unique('uq_synth_step_order', ['synthId', 'order'])
export class SynthStep {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Index()
    @Column({ type: 'uuid' })
    userId: UUID

    @Field(() => Synthesis)
    @ManyToOne(() => Synthesis, synth => synth.steps, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'synth_id' })
    synth: Synthesis

    @Field(() => ID)
    @Index()
    @Column({ name: 'synth_id', type: 'uuid' })
    synthId: UUID

    @Field(() => Int)
    @Column({ type: 'int', name: 'step_order' })
    order: number

    @Field(() => [SynthStepItem], { nullable: true })
    @OneToMany(() => SynthStepItem, item => item.step, { cascade: true })
    items: SynthStepItem[] | null

    @Field(() => String, { nullable: true })
    @Column({ type: 'text', nullable: true })
    description: string | null

    @Field(() => String, { nullable: true })
    @Column({ type: 'varchar', nullable: true })
    reactionType: string | null // es. "ossidazione", "alchilazione"

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }
}
