import { BeforeInsert, Column, Entity, Index, OneToMany, PrimaryColumn } from "typeorm";
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
    @Column()
    userId: UUID

    @Field(() => [MoleculeCollectionItemJoin], { nullable: true })
    @OneToMany(() => MoleculeCollectionItemJoin, join => join.collection)
    items: MoleculeCollectionItemJoin[]

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }

}
