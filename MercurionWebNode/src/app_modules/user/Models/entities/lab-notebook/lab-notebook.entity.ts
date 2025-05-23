import { uuidv7 } from "@kripod/uuidv7";
import { UUID } from "crypto";
import { BeforeInsert, Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { NotebookChapter } from "./lab-notebook-chapter.entity";
import { ObjectType, Field, ID } from '@nestjs/graphql';


@ObjectType()
@Entity('lab_notebooks')
export class LabNotebook {
    
    @Field(() => ID)
    @PrimaryColumn({ type: 'uuid' })
    id: UUID
    
    @Field(() => ID)
    @Column({ type: 'uuid' })
    userId: UUID
    
    @Field()
    @Column({ type: 'varchar' })
    title: string

    @Field(() => [NotebookChapter])
    @OneToMany(() => NotebookChapter, chapter => chapter.notebook)
    chapters: NotebookChapter[]

    @Field({ nullable: true })
    @Column({ nullable: true, type: 'bigint' })
    createdAt: number | null
    
    @Field({ nullable: true })
    @Column({ nullable: true, type: 'bigint' })
    updatedAt: number | null

    @BeforeInsert() 
    generateId() {
        this.id = uuidv7() as UUID;
        this.createdAt = Date.now()
    }
    
}
