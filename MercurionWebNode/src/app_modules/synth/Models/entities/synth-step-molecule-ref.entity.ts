import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { BeforeInsert, Column, Entity, ManyToOne, PrimaryColumn, JoinColumn } from 'typeorm';
import { SynthStep } from './synth-step.entity';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { MoleculeRole } from '../enums/molecule-role.enum';
import { CustomMoleculeItemEntity } from 'src/app_modules/molecule-collection/Models/entities/custom-molecule-item.entity';

@ObjectType()
@Entity('synth_step_molecule_refs')
export class SynthStepMoleculeRef {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Column()
    userId: UUID

    @Field(() => SynthStep)
    @ManyToOne(() => SynthStep, step => step.moleculeRefs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'step_id' })
    step: SynthStep

    @Field(() => ID)
    @Column({ type: 'uuid' })
    stepId: UUID

    @Field(() => CustomMoleculeItemEntity, { nullable: true })
    @ManyToOne(() => CustomMoleculeItemEntity, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'molecule_id' })
    molecule: CustomMoleculeItemEntity | null

    @Field(() => ID, { nullable: true })
    @Column({ type: 'uuid' })
    moleculeId: UUID | null

    @Field(() => MoleculeRole)
    @Column({ type: 'varchar' })
    role: MoleculeRole

    @Field(() => Boolean)
    @Column({ type: 'boolean' })
    showAliasOnTheArrow: boolean

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }

}
