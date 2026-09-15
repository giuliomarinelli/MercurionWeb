import { BeforeInsert, Column, Entity, Index, OneToMany, PrimaryColumn } from "typeorm";
import { UUID } from "crypto";
import { uuidv7 } from "@kripod/uuidv7";
import { MoleculeCollectionItemJoin } from "./molecule-collection-item-join.entity";
import { Field, ID, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
@Entity('molecule_collections')
@Index('uq_molecule_collections_id_user', ['id', 'userId'], { unique: true })
@Index('idx_molecule_collections_user_name', ['userId', 'name'])
@Index('idx_molecule_collections_user_touched', ['userId', 'touchedAt'])
export class MoleculeCollection {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id!: UUID

    @Field()
    @Column()
    name!: string

    @Index()
    @Column({ type: 'uuid' })
    userId!: UUID

    @Field(() => [MoleculeCollectionItemJoin], { nullable: true })
    @OneToMany(() => MoleculeCollectionItemJoin, join => join.collection)
    items!: MoleculeCollectionItemJoin[]

    @Field(() => String)
    @Column({ type: 'bigint' })
    createdAt!: number

    @Field(() => String)
    @Column({ type: 'bigint' })
    updatedAt!: number

    @Field(() => String)
    @Column({ type: 'bigint' })
    touchedAt!: number

    @Field(() => Int)
    itemsCount!: number

    @BeforeInsert()
    private init() {
        this.id = uuidv7() as UUID
        this.createdAt = Date.now()
        this.updatedAt = Date.now()
    }

}
