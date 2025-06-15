import { uuidv7 } from '@kripod/uuidv7';
import { UUID } from 'crypto';
import { Entity, Column, Index, PrimaryColumn } from 'typeorm';

@Entity('oauth2_tokens')
@Index(['provider', 'userId'], { unique: true })
export class OAuth2TokenEntity {

    @PrimaryColumn()
    id: UUID

    @Column({ length: 32 })
    provider: string

    @Column({ type: 'uuid', nullable: true })
    userId: UUID | null

    @Column({ type: 'text' })
    refreshToken: string

    @Column({ type: 'varchar', length: 255, nullable: true })
    scope: string | null

    @Column({ type: 'bigint', default: null })
    createdAt: number | null

    @Column({ type: 'bigint', default: null })
    updatedAt: number | null

    private onInsert() {
        this.id = uuidv7() as UUID
        this.createdAt = Date.now()
    }

}
