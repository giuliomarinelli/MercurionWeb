import { uuidv7 } from '@kripod/uuidv7';
import { UUID } from "crypto"
import { BeforeInsert, Column, Entity, OneToMany, PrimaryColumn } from "typeorm"
import { MfaBackupCode } from "./backup-code.entity"
import { OldPasswordItem } from '../DTO/old-password-item.interface';

@Entity({ name: 'users' })
export class User {

    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Column({ type: 'varchar', unique: true, default: null })
    email: string | null // nullo fino ad attivazione account con conferma email con link

    @Column({ type: 'varchar', nullable: true })
    unconfirmedEmail: string | null // nullo con email confermata, valorizzata con nuova email da confermare via OTP

    @Column({ type: 'varchar', nullable: true, default: null })
    completePhoneNumber: string | null // opzionale: numero di telefono comprensivo del prefisso internazionale

    @Column({ type: 'int', default: 0 })
    phoneNumberPrefixLength: number // lunghezza del prefisso internazionale se si vuole parsare solo il numero

    @Column({ type: 'varchar', nullable: true, default: null })
    unconfirmedPhoneNumber: string | null

    @Column({ type: 'int', nullable: true, default: null })
    unconfirmedPhoneNumberPrefixLength: number | null

    @Column({ type: 'varchar', length: 100 })
    passwordHash: string // hash argon2

    @Column({ type: 'varchar', default: '' })
    firstName: string

    @Column({ type: 'varchar', default: '' })
    lastName: string

    @Column({ type: 'varchar', length: 2, default: '' })
    initials: string

    @Column({ type: 'boolean', default: false })
    isVerified: boolean // portato a true dopo attivazione account con link email

    @Column({ type: 'text', default: '[]' })
    scopes: string // JSON.stringify degli scope UUID - permessi dell'utente (senza ruoli inutili e pesanti)

    @Column({ type: 'text', default: '[]' })
    mfaStrategies: string // JSON.stringify delle strategy UUID - permessi dell'utente (senza ruoli inutili e pesanti)

    @Column({ type: 'bigint', default: Date.now() })
    createdAt: number

    @Column({ type: 'bigint', default: Date.now() })
    updatedAt: number

    @Column({ type: 'varchar', default: '' })
    otpSecret: string

    @Column({ type: 'varchar', default: null, nullable: true })
    appTotpSecret: string | null

    @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
    oldPasswordHashes: OldPasswordItem[]

    @OneToMany(() => MfaBackupCode, (backupCode) => backupCode.user, { cascade: true })
    backupCodes: MfaBackupCode[]

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }

}
