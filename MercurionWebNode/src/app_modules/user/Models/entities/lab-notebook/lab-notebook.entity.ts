import { uuidv7 } from "@kripod/uuidv7";
import { UUID } from "crypto";
import { BeforeInsert, Column, Entity, Index, OneToMany, PrimaryColumn } from "typeorm";
import { NotebookChapter } from "./lab-notebook-chapter.entity";
import { ObjectType, Field, ID } from '@nestjs/graphql';


@ObjectType()
@Entity('lab_notebooks')
export class LabNotebook {

    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Index()
    @Column({ type: 'uuid' })
    userId: UUID

    @Field()
    @Column({ type: 'varchar' })
    title: string

    @Field(() => [NotebookChapter])
    @OneToMany(() => NotebookChapter, chapter => chapter.notebook)
    chapters: NotebookChapter[]

    @Field(() => String, { nullable: true })
    @Column({ nullable: true, type: 'bigint' })
    createdAt: number | null

    @Field(() => String, { nullable: true })
    @Column({ nullable: true, type: 'bigint' })
    updatedAt: number | null

    @BeforeInsert()
    generateId() {
        this.id = uuidv7() as UUID
        this.createdAt = Date.now()
    }

}
