import { BeforeInsert, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { UUID } from "crypto";
import { uuidv7 } from "@kripod/uuidv7";
import { NotebookPage } from "../entities/lab-notebook-page.entity";
import { MoleculeCollectionItemEntity } from "src/app_modules/molecule-collection/Models/entities/molecule-collection-item.entity";

@Entity('lab_notebook_links')
export class LabNotebookLink {

    @PrimaryColumn({ type: 'uuid' }) id: UUID

    @ManyToOne(() => NotebookPage, note => note.links, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'note_id' })
    note: NotebookPage

    @ManyToOne(() => MoleculeCollectionItemEntity, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'item_id' })
    item: MoleculeCollectionItemEntity

    @BeforeInsert() generateId() {
        this.id = uuidv7() as UUID
    }
}
