import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, BeforeInsert } from 'typeorm';
import { UUID } from 'crypto';
import { uuidv7 } from '@kripod/uuidv7';
import { User } from 'src/app_modules/user/Models/entities/user.entity';
import { AuthProvider } from '../enums/auth-provider.enum';



@Entity('auth_identities')
export class AuthIdentity {

    @PrimaryColumn({ type: 'uuid' })
    id: UUID

    @Column({ type: 'uuid' })
    userId: UUID

    @ManyToOne(() => User, (u) => u.authIdentities, {
        onDelete: 'CASCADE',
        nullable: false
    })
    @JoinColumn({ name: 'user_id' })
    user: User

    @Column({ type: 'text' })
    provider: AuthProvider

    @Column({ type: 'text', name: 'provider_subject' })
    providerSubject: string

    @Column({ type: 'varchar', length: 255, nullable: true })
    email: string | null

    @Column({ type: 'boolean', name: 'email_verified', default: false })
    emailVerified: boolean

    @Column({ type: 'bigint', name: 'created_at' })
    createdAt: number

    @Column({ type: 'bigint', name: 'updated_at' })
    updatedAt: number

    @BeforeInsert()
    private onInsert() {
        this.id = uuidv7() as UUID
        const now = Date.now()
        this.createdAt = now
        this.updatedAt = now
    }
}
