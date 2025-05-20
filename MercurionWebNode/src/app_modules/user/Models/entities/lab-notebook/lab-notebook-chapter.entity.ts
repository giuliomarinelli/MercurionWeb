import { uuidv7 } from "@kripod/uuidv7";
import { UUID } from "crypto";
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { LabNotebook } from "./lab-notebook.entity";
import { NotebookSection } from "./lab-notebook-section.entity";

@Entity('lab_notebook_chapters')
export class NotebookChapter {
    
    @PrimaryColumn({ type: 'uuid' }) id: UUID
    @Column({ type: 'varchar' }) title: string

    @ManyToOne(() => LabNotebook, notebook => notebook.chapters, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'notebook_id' })
    notebook: LabNotebook

    @OneToMany(() => NotebookSection, section => section.chapter, { cascade: true })
    sections: NotebookSection[]

    @BeforeInsert() generateId() {
        this.id = uuidv7() as UUID
    }
}
