import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "../user.entity";
import { UUID } from "crypto";
import { uuidv7 } from "@kripod/uuidv7";
import { MoleculeCollectionItemJoin } from "./molecule-collection-item-join.entity";

@Entity('molecule_collections')
export class MoleculeCollection {

    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Column()
    name: string

    @ManyToOne(() => User, user => user.collections)
    @JoinColumn({ name: 'user_id' })
    user: User

    @OneToMany(() => MoleculeCollectionItemJoin, join => join.collection)
    items: MoleculeCollectionItemJoin[]

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }

}
