import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { BeforeInsert, Column, Entity, OneToMany, PrimaryColumn, Index } from 'typeorm';
import { SynthStep } from './synth-step.entity';
import { Field, ID, ObjectType } from '@nestjs/graphql';
import { SynthesisPoolCollection } from './synthesis-pool-collection.entity';
import { SynthesisPoolMolecule } from './synthesis-pool-molecule.entity';

@ObjectType()
@Entity('synthesis')
export class Synthesis {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID    

    @Index()
    @Column({ type: 'uuid' })
    userId: UUID

    @Field()
    @Column({ type: 'varchar' })
    title: string

    @Field(() => String, { nullable: true })
    @Column({ type: 'text', nullable: true })
    notes: string | null

    @Field(() => [SynthStep], { nullable: true })
    @OneToMany(() => SynthStep, step => step.synth, { cascade: true })
    steps: SynthStep[] | null

    @Field(() => [SynthesisPoolCollection], { nullable: true })
    @OneToMany(() => SynthesisPoolCollection, poolCollection => poolCollection.synthesis, { cascade: true })
    poolCollections: SynthesisPoolCollection[] | null

    @Field(() => [SynthesisPoolMolecule], { nullable: true })
    @OneToMany(() => SynthesisPoolMolecule, poolMolecule => poolMolecule.synthesis, { cascade: true })
    poolMolecules: SynthesisPoolMolecule[] | null

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }
}
