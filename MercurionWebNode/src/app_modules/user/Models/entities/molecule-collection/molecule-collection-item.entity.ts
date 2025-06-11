import { uuidv7 } from '@kripod/uuidv7';
import { UUID } from 'crypto';
import { BeforeInsert, Column, Entity, OneToMany, PrimaryColumn, TableInheritance } from 'typeorm';
import { MoleculeCollectionItemJoin } from './molecule-collection-item-join.entity';

@Entity('molecule_collection_items')
@TableInheritance({ column: { type: 'varchar', name: 'type' } })
export abstract class MoleculeCollectionItemEntity {

    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Column({ type: 'uuid', unique: true })
    userId: UUID

    @Column({ nullable: true, type: 'varchar' })
    label: string | null

    @Column({ nullable: true, type: 'text' })
    notes: string | null

    @Column({ type: 'varchar' })
    type: string

    @OneToMany(() => MoleculeCollectionItemJoin, join => join.item)
    joins: MoleculeCollectionItemJoin[]

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }

}
