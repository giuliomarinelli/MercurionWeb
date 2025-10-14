import { Entity, Column, Index, PrimaryColumn, BeforeInsert } from 'typeorm';
import { UUID } from 'crypto';
import { StorageType } from '../enums/storage-type.enum';
import { uuidv7 } from '@kripod/uuidv7';
import { StorageScope } from '../enums/storage-scope.enum';

@Entity('documents')
@Index(['userId', 'storageType', 'storagePath'], { unique: true })
export class DocumentEntity {

    @PrimaryColumn()
    id: UUID

    @Index()
    @Column({ type: 'uuid' })
    userId: UUID

    @Index()
    @Column({ type: 'varchar', length: 32 })
    storageType: StorageType

    @Column({ type: 'varchar', length: 1024 })
    storagePath: string // path/id sullo store

    @Column({ type: 'varchar', length: 255 })
    originalName: string

    @Column({ type: 'bigint' })
    size: number

    @Column({ type: 'varchar', length: 128 })
    mimeType: string

    @Column({ type: 'text', nullable: true, default: null })
    note: string | null

    @Column({ type: 'boolean', default: false })
    isPublic: boolean

    @Column({ type: 'bigint', default: null })
    createdAt: number

    @Column({ type: 'bigint', default: null })
    updatedAt: number

    @Column()
    scope: StorageScope

    @Column()
    isActive: boolean

    @BeforeInsert()
    onInsert(): void {
        this.id = uuidv7() as UUID
        this.createdAt = Date.now()
    }

}
