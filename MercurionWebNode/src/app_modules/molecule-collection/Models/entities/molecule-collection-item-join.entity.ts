import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { MoleculeCollection } from "./molecule-collection.entity";
import { MoleculeCollectionItemEntity } from "./molecule-collection-item.entity";
import { UUID } from "crypto";
import { uuidv7 } from "@kripod/uuidv7";
import { Field, ID, ObjectType } from "@nestjs/graphql";

@ObjectType()
@Entity('molecule_collection_items_join')
export class MoleculeCollectionItemJoin {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Index()
    @Column({ type: 'uuid' })
    userId: UUID

    @Field(() => MoleculeCollection, { nullable: true })
    @ManyToOne(() => MoleculeCollection, collection => collection.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'collection_id' })
    collection: MoleculeCollection

    @Field(() => MoleculeCollectionItemEntity, { nullable: true })
    @ManyToOne(() => MoleculeCollectionItemEntity, item => item.joins, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'item_id' })
    item: MoleculeCollectionItemEntity

    @Column({ type: 'uuid' })
    collectionId: UUID

    @Column({ type: 'uuid' })
    itemId: UUID

    // 🔧 Estensioni future: tag, commenti, ordine, metadati?

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }

}
