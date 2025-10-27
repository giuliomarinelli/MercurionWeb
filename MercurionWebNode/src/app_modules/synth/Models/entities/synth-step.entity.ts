import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { BeforeInsert, Column, Entity, ManyToOne, PrimaryColumn, OneToMany, JoinColumn, Index, OneToOne } from 'typeorm';
import { Synthesis } from './synthesis.entity';
import { SynthStepMoleculeRef } from './synth-step-molecule-ref.entity';
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { CustomMoleculeItemEntity } from 'src/app_modules/molecule-collection/Models/entities/custom-molecule-item.entity';

@ObjectType()
@Entity('synth_steps')
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

    @Field(() => ID, { nullable: true })
    @Column({ name: 'synth_id', type: 'uuid' })
    synthId: UUID

    @Field(() => Int)
    @Column({ type: 'int', name: 'step_order' })
    order: number

    @Field(() => [SynthStepMoleculeRef])
    @OneToMany(() => SynthStepMoleculeRef, ref => ref.step, { cascade: true })
    moleculeRefs: SynthStepMoleculeRef[]

    @Field(() => CustomMoleculeItemEntity)
    @OneToOne(() => CustomMoleculeItemEntity, mol => mol.id, { cascade: true, onDelete: 'CASCADE' })
    @JoinColumn()
    mainSubstrate: CustomMoleculeItemEntity

    @Field(() => ID)
    @Column({ type: 'uuid' })
    mainSubstrateId: UUID

    @Field(() => CustomMoleculeItemEntity)
    @OneToOne(() => CustomMoleculeItemEntity, mol => mol.id, { cascade: true, onDelete: 'CASCADE' })
    @JoinColumn()
    mainProduct: CustomMoleculeItemEntity

    @Field(() => ID)
    @Column({ type: 'uuid' })
    mainProductId: UUID

    @Field(() => String, { nullable: true })
    @Column({ type: 'text', nullable: true })
    description: string | null

    @Field(() => String, { nullable: true })
    @Column({ type: 'varchar', nullable: true })
    reactionType: string | null // es. "ossidazione", "alchilazione"

    @Field(() => [String])
    @Column({ type: 'varchar', nullable: true, default: () => `'[]'::jsonb` })
    conditions: string[] | null // condizioni di reazione (sulla freccia, es: "HCl, 60°C")

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }
}
