import { BeforeInsert, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { UUID } from "crypto";
import { MoleculeCollectionItemEntity } from "./molecule-collection/molecule-collection-item.entity";
import { uuidv7 } from "@kripod/uuidv7";
import { NotebookPage } from "./lab-notebook/lab-notebook-page.entity";

@Entity('lab_notebook_links')
export class LabNotebookLink {

    @PrimaryColumn({ type: 'uuid' }) id: UUID

    @ManyToOne(() => NotebookPage, note => note.links, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'note_id' })
    note: NotebookPage;

    @ManyToOne(() => MoleculeCollectionItemEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'item_id' })
    item: MoleculeCollectionItemEntity

    @BeforeInsert() generateId() {
        this.id = uuidv7() as UUID
    }
}
