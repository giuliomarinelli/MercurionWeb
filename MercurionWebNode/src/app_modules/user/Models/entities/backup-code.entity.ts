import { UUID } from "crypto";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.entity";

@Entity({ name: 'backup_codes' })
export class MfaBackupCode {

    @PrimaryGeneratedColumn('uuid')
    id: UUID

    @Column()
    hash: string

    @Column({ default: false })
    used: boolean

    @Column({ type: 'bigint' })
    createdAt: number
    
    @Column({ type: 'bigint', nullable: true, default: null })
    usedAt: number | null

    @ManyToOne(() => User, user => user.backupCodes)
    user: User

}