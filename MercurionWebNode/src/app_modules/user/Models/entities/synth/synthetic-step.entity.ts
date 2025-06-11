import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { BeforeInsert, Column, Entity, ManyToOne, PrimaryColumn, OneToMany, JoinColumn } from 'typeorm';
import { SyntheticRouteEntity } from './synthetic-route.entity';
import { SyntheticStepMoleculeRef } from './synthetic-step-molecule-ref.entity';

@Entity('synthetic_steps')
export class SyntheticStepEntity {
    @PrimaryColumn({ type: 'uuid' })
    id: UUID;

    @ManyToOne(() => SyntheticRouteEntity, route => route.steps)
    @JoinColumn({ name: 'route_id' })
    route: SyntheticRouteEntity;

    @Column({ type: 'int' })
    order: number

    @Column({ type: 'varchar', nullable: true })
    description: string | null

    @Column({ type: 'varchar', nullable: true })
    reactionType: string | null // es. "ossidazione", "alchilazione"

    @Column({ type: 'varchar', nullable: true })
    conditions: string | null // condizioni di reazione (sulla freccia, es: "HCl, 60°C")

    @OneToMany(() => SyntheticStepMoleculeRef, ref => ref.step, { cascade: true })
    moleculeRefs: SyntheticStepMoleculeRef[]

    @Column({ type: 'json', nullable: true })
    rawEditorData: any // File/JSON del chemical editor (per future editabilità)

    @Column({ type: 'text', nullable: true })
    structureImage: string | null // base64/svg/URL della preview

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }
}
