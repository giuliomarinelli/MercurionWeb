import { BeforeInsert, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { LabNotebookEntry } from "./lab-notbook-entry.entity";
import { UUID } from "crypto";
import { MoleculeCollectionItemEntity } from "./molecule-collection-item.entity";
import { uuidv7 } from "@kripod/uuidv7";

@Entity('lab_notebook_links')
export class LabNotebookLink {

    @PrimaryColumn({ type: 'uuid' }) id: UUID

    @ManyToOne(() => LabNotebookEntry, note => note.links)
    @JoinColumn({ name: 'note_id' }) 
    note: LabNotebookEntry;

    @ManyToOne(() => MoleculeCollectionItemEntity)
    @JoinColumn({ name: 'item_id' }) 
    item: MoleculeCollectionItemEntity

    @BeforeInsert() generateId() {
        this.id = uuidv7() as UUID
    }
}
