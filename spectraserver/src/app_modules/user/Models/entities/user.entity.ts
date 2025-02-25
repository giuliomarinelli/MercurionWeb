import { UUID } from "crypto"
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm"

@Entity({ name: 'users' })
export class User {

    @PrimaryGeneratedColumn('uuid')
    id: UUID

    @Column({ type: 'nvarchar', unique: true })
    email: string

    @Column({ type: 'nvarchar', length: 100 })
    passwordHash: string

    @Column({ type: 'nvarchar', nullable: true })
    firstName: string

    @Column({ type: 'nvarchar', nullable: true })
    lastName: string

    @Column({ type: 'boolean', default: false })
    isVerified: boolean

    @Column({ type: 'text' })
    scopes: string // JSON.stringify degli scope UUID

    @Column({ type: 'boolean', default: false })
    isAdmin: boolean

    @Column({ type: 'bigint', default: Date.now() })
    createdAt: number

    @Column({ type: 'bigint', default: Date.now() })
    updatedAt: number
}
