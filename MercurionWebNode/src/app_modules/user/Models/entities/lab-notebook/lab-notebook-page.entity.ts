import { UUID } from "crypto";
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { NotebookSection } from "./lab-notebook-section.entity";
import { LabNotebookLink } from "../lab-notebook-link.entity";
import { uuidv7 } from "@kripod/uuidv7";

@Entity('lab_notebook_pages')
export class NotebookPage {

    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Column({ type: 'uuid' })
    userId: UUID

    @Column({ type: 'varchar' })
    title: string

    @Column({ type: 'text' })
    content: string          // HTML o Delta

    @Column({ type: 'text' })
    sanitizedText: string    // per Meilisearch

    @ManyToOne(() => NotebookSection, section => section.pages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'section_id' })
    section: NotebookSection

    @OneToMany(() => LabNotebookLink, link => link.note)
    links: LabNotebookLink[]

    @Column({ nullable: true, type: 'bigint' })
    createdAt: number

    @Column({ nullable: true, type: 'bigint' })
    updatedAt: number

    @BeforeInsert() generateId() {
        this.id = uuidv7() as UUID
        this.createdAt = Date.now()
    }

    @Column({ type: 'int', default: 0 })
    order: number

    @BeforeUpdate() updateDate() {
        this.updatedAt = Date.now()
    }
}
