import { uuidv7 } from "@kripod/uuidv7";
import { UUID } from "crypto";
import { BeforeInsert, Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { NotebookChapter } from "./lab-notebook-chapter.entity";


@Entity('lab_notebooks')
export class LabNotebook {
    
    @PrimaryColumn({ type: 'uuid' }) 
    id: UUID
    
    @Column({ type: 'uuid' }) 
    userId: UUID
    
    @Column({ type: 'varchar' }) 
    title: string

    @OneToMany(() => NotebookChapter, chapter => chapter.notebook)
    chapters: NotebookChapter[]

    @Column({ nullable: true, type: 'bigint' }) 
    createdAt: number | null
    
    @Column({ nullable: true, type: 'bigint' }) 
    updatedAt: number | null

    @BeforeInsert() 
    generateId() {
        this.id = uuidv7() as UUID;
        this.createdAt = Date.now()
    }
    
}
