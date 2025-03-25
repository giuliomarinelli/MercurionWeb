import { UUID } from "crypto"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity({ name: 'users' })
export class User {

    @PrimaryGeneratedColumn('uuid')
    id: UUID

    @Column({ type: 'nvarchar', unique: true, default: null })
    email: string | null // nullo fino ad attivazione account con conferma email con link

    @Column({ type: 'nvarchar', nullable: true })
    unconfirmedEmail: string | null // nullo con email confermata, valorizzata con nuova email da confermare via OTP

    @Column({ type: 'varchar', nullable: true, default: null })
    completePhoneNumber: string | null // opzionale: numero di telefono comprensivo del prefisso internazionale

    @Column({ type: 'int', default: 0 })
    phoneNumberPrefixLength: number // lunghezza del prefisso internazionale se si vuole parsare solo il numero

    @Column({ type: 'varchar', length: 100 })
    passwordHash: string // hash argon2

    @Column({ type: 'varchar' })
    firstName: string

    @Column({ type: 'varchar' })
    lastName: string

    @Column({ type: 'boolean', default: false })
    isVerified: boolean // portato a true dopo attivazione account con link email

    @Column({ type: 'text' })
    scopes: string // JSON.stringify degli scope UUID - permessi dell'utente (senza ruoli inutili e pesanti)

    @Column({ type: 'bigint', default: Date.now() })
    createdAt: number

    @Column({ type: 'bigint', default: null, nullable: true })
    updatedAt: number
}
