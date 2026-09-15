import { UUID } from "crypto";
import { BeforeInsert, Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";
import { uuidv7 } from "@kripod/uuidv7";

@Entity({ name: 'backup_codes' })
export class MfaBackupCode {

    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Column()
    hash: string

    @Column({ default: false })
    used: boolean

    @Column({ type: 'bigint' })
    createdAt: number

    @Column({ type: 'bigint', nullable: true, default: null })
    usedAt: number | null

    @ManyToOne(() => User, user => user.backupCodes, { onDelete: 'CASCADE', nullable: false })
    @JoinColumn()
    user: User

    @Column({ type: 'uuid' })
    userId: UUID

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }

}