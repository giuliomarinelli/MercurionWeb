import { uuidv7 } from '@kripod/uuidv7';
import { UUID } from "crypto"
import { BeforeInsert, Column, Entity, Index, JoinColumn, OneToMany, OneToOne, PrimaryColumn } from "typeorm"
import { MfaBackupCode } from "./backup-code.entity"
import { OldPasswordItem } from '../dto/old-password-item.interface';
import { DocumentEntity } from 'src/app_modules/dropbox-object-store/models/entities/document.entity';
import { UserGender } from '../enums/user-gender.enum';
import { AuthIdentity } from '../../../sso/models/entities/auth-identity.entity'

@Entity({ name: 'users' })
@Index('uq_users_registration_identity', ['registrationIdentity'], { unique: true, where: '"registration_identity" IS NOT NULL' })
export class User {

    @PrimaryColumn({ type: 'uuid' })
    id!: UUID

    @Column({ type: 'varchar', unique: true, default: null })
    email!: string | null // nullo fino ad attivazione account con conferma email con link

    /**
     * Durable identity for an unverified native registration.  It closes the
     * pre-activation race without making nullable `email` unique semantics do
     * the work (email remains null until activation).
     */
    @Column({ type: 'varchar', length: 320, nullable: true })
    registrationIdentity!: string | null

    @Column({ type: 'varchar', nullable: true })
    unconfirmedEmail!: string | null // nullo con email confermata, valorizzata con nuova email da confermare via OTP

    @Column({ type: 'varchar', nullable: true, default: null })
    completePhoneNumber!: string | null // opzionale: numero di telefono comprensivo del prefisso internazionale

    @Column({ type: 'bigint', default: 0 })
    phoneNumberPrefixLength!: number // lunghezza del prefisso internazionale se si vuole parsare solo il numero

    @Column({ type: 'varchar', nullable: true, default: null })
    unconfirmedPhoneNumber!: string | null

    @Column({ type: 'bigint', nullable: true, default: null })
    unconfirmedPhoneNumberPrefixLength!: number | null

    @Column({ type: 'varchar', length: 100, nullable: true })
    passwordHash!: string | null // hash argon2

    @Column({ type: 'varchar', default: '' })
    firstName!: string

    @Column({ type: 'varchar', default: '' })
    lastName!: string

    @Column({ type: 'varchar', default: UserGender.Undefined })
    gender!: UserGender

    @Column({ type: 'varchar', nullable: true })
    job!: string | null

    @Column({ type: 'varchar', length: 2, default: '' })
    initials!: string

    @Column({ type: 'boolean', default: false })
    isVerified!: boolean // portato a true dopo attivazione account con link email

    @Column({ type: 'jsonb', default: '[]' })
    scopes!: string[]

    @Column({ type: 'text', default: '[]' })
    mfaStrategies!: string // JSON.stringify delle strategy UUID - permessi dell'utente (senza ruoli inutili e pesanti)

    @Column({ type: 'bigint' })
    createdAt!: number

    @Column({ type: 'bigint' })
    updatedAt!: number

    @Column({ type: 'varchar', default: '' })
    otpSecret!: string

    @Column({ type: 'varchar', default: null, nullable: true })
    appTotpSecret!: string | null

    @Column({ type: 'jsonb', default: '[]' })
    oldPasswordHashes!: OldPasswordItem[]

    @OneToMany(() => MfaBackupCode, (backupCode) => backupCode.user, { cascade: true })
    backupCodes!: MfaBackupCode[]

    @OneToOne(() => DocumentEntity, { cascade: true, nullable: true })
    @JoinColumn({ name: 'avatar_id' })
    avatar!: DocumentEntity | null

    @Column({ type: 'uuid', nullable: true })
    avatarId!: UUID | null

    @Column({ type: 'boolean', default: false })
    backupCodesGiven!: boolean

    @Column({ type: 'varchar', nullable: true })
    accountRecoveryCodeHash!: string | null

    @Column({ type: 'bool', default: false })
    locked!: boolean

    @Column({ type: 'bool', default: false })
    recoveryMode!: boolean

    @Column({ type: 'boolean', default: false })
    sso!: boolean

    @OneToMany(() => AuthIdentity, (ai) => ai.user, { cascade: true })
    authIdentities!: AuthIdentity[]

    @BeforeInsert()
    private generateId() {
        this.id = uuidv7() as UUID
    }

}
