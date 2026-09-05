import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { Field, ID, ObjectType } from '@nestjs/graphql';
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
import { MoleculeCollection } from '../../../molecule-collection/Models/entities/molecule-collection.entity';
import { Synthesis } from './synthesis.entity';

@ObjectType()
@Entity('synthesis_pool_collections')
@Unique('uq_synthesis_pool_collection', ['synthesisId', 'collectionId'])
export class SynthesisPoolCollection {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Index()
    @Column({ name: 'user_id', type: 'uuid' })
    userId: UUID

    @ManyToOne(() => Synthesis, synthesis => synthesis.poolCollections, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'synthesis_id' })
    synthesis: Synthesis

    @Field(() => ID)
    @Index()
    @Column({ name: 'synthesis_id', type: 'uuid' })
    synthesisId: UUID

    @Field(() => MoleculeCollection)
    @ManyToOne(() => MoleculeCollection, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'collection_id' })
    collection: MoleculeCollection

    @Field(() => ID)
    @Index()
    @Column({ name: 'collection_id', type: 'uuid' })
    collectionId: UUID

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }
}
