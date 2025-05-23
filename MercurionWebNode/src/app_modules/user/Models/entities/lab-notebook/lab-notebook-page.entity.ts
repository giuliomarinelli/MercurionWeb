import { UUID } from "crypto";
import { BeforeInsert, BeforeUpdate, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { NotebookSection } from "./lab-notebook-section.entity";
import { LabNotebookLink } from "../lab-notebook-link.entity";
import { LabNotebookLinkType } from '../../DTO/lab-notebook/lab-notebook-link.type';
import { uuidv7 } from "@kripod/uuidv7";
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
@Entity('lab_notebook_pages')
export class NotebookPage {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Field(() => ID)
    @Column({ type: 'uuid' })
    userId: UUID

    @Field({ nullable: true })
    @Column({ type: 'varchar' })
    title: string

    @Field({ nullable: true })
    @Column({ type: 'text', default: '' })
    content: string          // HTML o Delta

    @Field({ nullable: true })
    @Column({ type: 'text', default: '' })
    sanitizedText: string    // per Meilisearch

    @Field(() => NotebookSection)
    @ManyToOne(() => NotebookSection, section => section.pages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'section_id' })
    section: NotebookSection

    @Field(() => [LabNotebookLinkType])
    @OneToMany(() => LabNotebookLink, link => link.note)
    links: LabNotebookLink[]

    @Field(() => String, { nullable: true })
    @Column({ nullable: true, type: 'bigint' })
    createdAt: number

    @Field(() => String, { nullable: true })
    @Column({ nullable: true, type: 'bigint' })
    updatedAt: number

    @BeforeInsert() generateId() {
        this.id = uuidv7() as UUID
        this.createdAt = Date.now()
    }

    @Field(() => Int)
    @Column({ type: 'int', default: 0 })
    order: number

    @BeforeUpdate() updateDate() {
        this.updatedAt = Date.now()
    }
}
