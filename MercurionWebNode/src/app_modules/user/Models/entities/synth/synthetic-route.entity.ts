import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { BeforeInsert, Column, Entity, OneToMany, PrimaryColumn, Index } from 'typeorm';
import { SyntheticStepEntity } from './synthetic-step.entity';
import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType()
@Entity('synthetic_routes')
export class SyntheticRouteEntity {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Field(() => String)
    @Index()
    @Column({ type: 'uuid' })
    userId: UUID

    @Field()
    @Column({ type: 'varchar' })
    title: string

    @Field(() => String, { nullable: true })
    @Column({ type: 'text', nullable: true })
    notes: string | null

    @Field(() => [SyntheticRouteEntity], { nullable: true })
    @OneToMany(() => SyntheticStepEntity, step => step.route, { cascade: true })
    steps: SyntheticStepEntity[]

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }
}
