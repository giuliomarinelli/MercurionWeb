import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { BeforeInsert, Column, Entity, ManyToOne, PrimaryColumn, OneToMany, JoinColumn } from 'typeorm';
import { SyntheticRouteEntity } from './synthetic-route.entity';
import { SyntheticStepMoleculeRef } from './synthetic-step-molecule-ref.entity';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Entity('synthetic_steps')
export class SyntheticStepEntity {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Field(() => SyntheticRouteEntity, { nullable: true })
    @ManyToOne(() => SyntheticRouteEntity, route => route.steps)
    @JoinColumn({ name: 'route_id' })
    route: SyntheticRouteEntity

    @Field()
    @Column({ type: 'int' })
    order: number

    @Field(() => String, { nullable: true })
    @Column({ type: 'varchar', nullable: true })
    description: string | null

    @Field(() => String, { nullable: true })
    @Column({ type: 'varchar', nullable: true })
    reactionType: string | null // es. "ossidazione", "alchilazione"

    @Field(() => String, { nullable: true })
    @Column({ type: 'varchar', nullable: true })
    conditions: string | null // condizioni di reazione (sulla freccia, es: "HCl, 60°C")

    @Field(() => [SyntheticStepMoleculeRef], { nullable: true })
    @OneToMany(() => SyntheticStepMoleculeRef, ref => ref.step, { cascade: true })
    moleculeRefs: SyntheticStepMoleculeRef[]

    @Field(() => String, { nullable: true })
    @Column({ type: 'json', nullable: true })
    rawEditorData: any // File/JSON del chemical editor (per future editabilità)
    
    @Field(() => String, { nullable: true })
    @Column({ type: 'text', nullable: true })
    structureImage: string | null // base64/svg/URL della preview

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }
}
