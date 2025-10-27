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

    @Field(() => [SynthStepMoleculeRef], { nullable: true })
    @OneToMany(() => SynthStepMoleculeRef, ref => ref.step, { cascade: true })
    moleculeRefs: SynthStepMoleculeRef[] | null

    @Field(() => CustomMoleculeItemEntity, { nullable: true })
    @OneToOne(() => CustomMoleculeItemEntity, mol => mol.id, { cascade: true, onDelete: 'SET NULL' })
    @JoinColumn()
    mainSubstrate: CustomMoleculeItemEntity | null

    @Field(() => ID, { nullable: true })
    @Column({ type: 'uuid' })
    mainSubstrateId: UUID | null

    @Field(() => CustomMoleculeItemEntity, { nullable: true })
    @OneToOne(() => CustomMoleculeItemEntity, mol => mol.id, { cascade: true, onDelete: 'SET NULL' })
    @JoinColumn()
    mainProduct: CustomMoleculeItemEntity | null

    @Field(() => ID, { nullable: true })
    @Column({ type: 'uuid' })
    mainProductId: UUID | null

    @Field(() => String, { nullable: true })
    @Column({ type: 'text', nullable: true })
    description: string | null

    @Field(() => String, { nullable: true })
    @Column({ type: 'varchar', nullable: true })
    reactionType: string | null // es. "ossidazione", "alchilazione"

    @Field(() => [String])
    @Column({ type: 'jsonb', default: () => `'[]'::jsonb` })
    conditions: string[] // condizioni di reazione (sulla freccia, es: "HCl, 60°C")

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }
}
