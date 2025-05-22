import { UUID } from "crypto";
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { NotebookChapter } from "./lab-notebook-chapter.entity";
import { uuidv7 } from "@kripod/uuidv7";
import { NotebookPage } from "./lab-notebook-page.entity";

@Entity('lab_notebook_sections')
export class NotebookSection {

    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Column({ type: 'varchar' })
    title: string

    @Column({ type: 'uuid' })
    userId: UUID

    @ManyToOne(() => NotebookChapter, chapter => chapter.sections, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'chapter_id' })
    chapter: NotebookChapter

    @OneToMany(() => NotebookPage, page => page.section)
    pages: NotebookPage[]

    @Column({ type: 'int', default: 0 })
    order: number

    @Column({ type: 'text', default: null })
    description: string | null

    @BeforeInsert() generateId() {
        this.id = uuidv7() as UUID
    }
}
