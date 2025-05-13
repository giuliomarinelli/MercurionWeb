import { uuidv7 } from "@kripod/uuidv7";
import { UUID } from "crypto";
import { BeforeInsert, BeforeUpdate, Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { LabNotebookLink } from "./lab-notebook-link.entity";

@Entity('lab_notebooks')
export class LabNotebookEntry {

    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Column({ type: 'uuid' })
    userId: UUID

    @Column({ type: 'varchar' })
    title: string

    @Column({ type: 'text' })
    content: string
    // contenuto tiptap JSON stringificato
    @Column({ nullable: true, type: 'bigint' })
    createdAt: number

    @Column({ nullable: true, type: 'bigint' })
    updatedAt: number

    @OneToMany(() => LabNotebookLink, link => link.note)
    links: LabNotebookLink[]

    @BeforeInsert() 
    generateId() {
        this.id = uuidv7() as UUID
        this.createdAt = Date.now()
    }

    @BeforeUpdate()
    updateDate() {
        this.updatedAt = Date.now()
    }
}
