import { uuidv7 } from "@kripod/uuidv7";
import { UUID } from "crypto";
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { LabNotebook } from "./lab-notebook.entity";
import { NotebookSection } from "./lab-notebook-section.entity";
import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
@Entity('lab_notebook_chapters')
export class NotebookChapter {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Field(() => ID)
    @Column({ type: 'uuid' })
    userId: UUID
    
    @Field()
    @Column({ type: 'varchar' })
    title: string

    @Field(() => LabNotebook)
    @ManyToOne(() => LabNotebook, notebook => notebook.chapters, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'notebook_id' })
    notebook: LabNotebook

    @Field(() => [NotebookSection])
    @OneToMany(() => NotebookSection, section => section.chapter)
    sections: NotebookSection[]

    @Field(() => Int)
    @Column({ type: 'int', default: 0 })
    order: number

    @Field({ nullable: true })
    @Column({ nullable: true, type: 'bigint' })
    createdAt: number
    
    @Field({ nullable: true })
    @Column({ nullable: true, type: 'bigint' })
    updatedAt: number | null

    @BeforeInsert() generateId() {
        this.id = uuidv7() as UUID
        this.createdAt = Date.now()
    }
}
