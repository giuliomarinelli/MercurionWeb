import { UUID } from "crypto";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { User } from "./user.entity";
import { uuidv7 } from "@kripod/uuidv7";

@Entity({ name: 'backup_codes' })
export class MfaBackupCode {

    @PrimaryColumn()
    id: UUID = uuidv7() as UUID

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

}