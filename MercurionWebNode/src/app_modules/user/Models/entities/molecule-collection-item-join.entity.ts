import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { MoleculeCollection } from "./molecule-collection.entity";
import { MoleculeCollectionItemEntity } from "./molecule-collection-item.entity";

@Entity('molecule_collection_items_join')
export class MoleculeCollectionItemJoin {
    @PrimaryColumn()
    id: number;

    @ManyToOne(() => MoleculeCollection, collection => collection.items)
    @JoinColumn({ name: 'collection_id' })
    collection: MoleculeCollection;

    @ManyToOne(() => MoleculeCollectionItemEntity, item => item.joins)
    @JoinColumn({ name: 'item_id' })
    item: MoleculeCollectionItemEntity

    // 🔧 Estensioni future: tag, commenti, ordine, metadati?
}
