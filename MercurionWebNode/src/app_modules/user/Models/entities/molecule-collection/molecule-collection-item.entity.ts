import { uuidv7 } from '@kripod/uuidv7';
import { UUID } from 'crypto';
import { BeforeInsert, Column, Entity, Index, OneToMany, PrimaryColumn, TableInheritance } from 'typeorm';
import { MoleculeCollectionItemJoin } from './molecule-collection-item-join.entity';
import { Field, ID, InterfaceType } from '@nestjs/graphql';

@InterfaceType()
@Entity('molecule_collection_items')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class MoleculeCollectionItemEntity {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Index()
    @Column({ type: 'uuid' })
    userId: UUID

    @Field(() => String, { nullable: true })
    @Column({ nullable: true, type: 'varchar' })
    label: string | null

    @Field(() => String, { nullable: true })
    @Column({ nullable: true, type: 'text' })
    notes: string | null

    @Field()
    @Column({ type: 'varchar' })
    type: string

    @Field(() => [MoleculeCollectionItemJoin], { nullable: true })
    @OneToMany(() => MoleculeCollectionItemJoin, join => join.item)
    joins: MoleculeCollectionItemJoin[]

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }

}
