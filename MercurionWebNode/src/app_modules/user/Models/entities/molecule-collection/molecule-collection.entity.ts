import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { User } from "../user.entity";
import { UUID } from "crypto";
import { uuidv7 } from "@kripod/uuidv7";
import { MoleculeCollectionItemJoin } from "./molecule-collection-item-join.entity";
import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
@Entity('molecule_collections')
export class MoleculeCollection {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Field()
    @Column()
    name: string

    @Index()
    @ManyToOne(() => User, user => user.collections)
    @JoinColumn({ name: 'user_id' })
    user: User

    @Field(() => [MoleculeCollectionItemJoin], { nullable: true })
    @OneToMany(() => MoleculeCollectionItemJoin, join => join.collection)
    items: MoleculeCollectionItemJoin[]

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }

}
