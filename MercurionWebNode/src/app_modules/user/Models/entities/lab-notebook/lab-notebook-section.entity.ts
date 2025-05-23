import { UUID } from "crypto";
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { NotebookChapter } from "./lab-notebook-chapter.entity";
import { uuidv7 } from "@kripod/uuidv7";
import { NotebookPage } from "./lab-notebook-page.entity";
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
@Entity('lab_notebook_sections')
export class NotebookSection {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Field()
    @Column({ type: 'varchar' })
    title: string

    @Field(() => ID)
    @Column({ type: 'uuid' })
    userId: UUID

    @Field(() => NotebookChapter)
    @ManyToOne(() => NotebookChapter, chapter => chapter.sections, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'chapter_id' })
    chapter: NotebookChapter

    @Field(() => [NotebookPage])
    @OneToMany(() => NotebookPage, page => page.section)
    pages: NotebookPage[]

    @Field(() => Int)
    @Column({ type: 'int', default: 0 })
    order: number

    @Field(() => String, { nullable: true })
    @Column({ type: 'text', default: null })
    description: string | null

    @Field(() => String, { nullable: true })
    @Column({ type: 'bigint', default: null })
    createdAt: number

    @Field(() => String, { nullable: true })
    @Column({ type: 'bigint', default: null })
    updatedAt: number

    @BeforeInsert() generateId() {
        this.id = uuidv7() as UUID
        this.createdAt = Date.now()
    }
}
