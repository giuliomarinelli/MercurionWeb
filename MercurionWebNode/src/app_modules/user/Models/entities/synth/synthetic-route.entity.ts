import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { BeforeInsert, Column, Entity, OneToMany, PrimaryColumn, Index } from 'typeorm';
import { SyntheticStepEntity } from './synthetic-step.entity';

@Entity('synthetic_routes')
export class SyntheticRouteEntity {

    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Index()
    @Column({ type: 'uuid' })
    userId: UUID

    @Column({ type: 'varchar' })
    title: string

    @Column({ type: 'text', nullable: true })
    notes: string | null

    @OneToMany(() => SyntheticStepEntity, step => step.route, { cascade: true })
    steps: SyntheticStepEntity[]

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }
}
