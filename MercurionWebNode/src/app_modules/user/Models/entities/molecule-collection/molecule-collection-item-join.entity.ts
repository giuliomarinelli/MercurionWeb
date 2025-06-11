import { BeforeInsert, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { MoleculeCollection } from "./molecule-collection.entity";
import { MoleculeCollectionItemEntity } from "./molecule-collection-item.entity";
import { UUID } from "crypto";
import { uuidv7 } from "@kripod/uuidv7";

@Entity('molecule_collection_items_join')
export class MoleculeCollectionItemJoin {

    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @ManyToOne(() => MoleculeCollection, collection => collection.items)
    @JoinColumn({ name: 'collection_id' })
    collection: MoleculeCollection

    @ManyToOne(() => MoleculeCollectionItemEntity, item => item.joins)
    @JoinColumn({ name: 'item_id' })
    item: MoleculeCollectionItemEntity

    // 🔧 Estensioni future: tag, commenti, ordine, metadati?

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }
}
