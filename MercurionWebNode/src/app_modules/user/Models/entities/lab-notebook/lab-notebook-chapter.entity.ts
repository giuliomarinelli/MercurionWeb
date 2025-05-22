import { uuidv7 } from "@kripod/uuidv7";
import { UUID } from "crypto";
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { LabNotebook } from "./lab-notebook.entity";
import { NotebookSection } from "./lab-notebook-section.entity";

@Entity('lab_notebook_chapters')
export class NotebookChapter {

    @PrimaryColumn({ type: 'uuid' }) id: UUID

    @Column({ type: 'varchar' }) title: string

    @Column({ type: 'uuid' }) userId: UUID

    @ManyToOne(() => LabNotebook, notebook => notebook.chapters, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'notebook_id' })
    notebook: LabNotebook

    @OneToMany(() => NotebookSection, section => section.chapter, { cascade: true })
    sections: NotebookSection[]

    @Column({ type: 'int', default: 0 })
    order: number

    @BeforeInsert() generateId() {
        this.id = uuidv7() as UUID
    }
}
