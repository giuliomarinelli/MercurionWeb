import {
    Entity,
    PrimaryColumn,
    Column,
    Index,
    Check,
    BeforeInsert
} from 'typeorm'

import {
    FeedbackEnv,
    FeedbackSource,
    FeedbackKind,
    FeedbackContextKind,
    FeedbackStatus
} from '../enums/feedback.enums'
import { uuidv7 } from '@kripod/uuidv7'
import { UUID } from 'crypto'
import { generateAnonAuthorKey } from '../../generate-anon-author-key'
import { Exclude } from 'class-transformer'

@Entity({ name: 'feedback' })
@Index('feedback_env_created_at_ms_idx', ['env', 'createdAtMs'])
@Index('feedback_env_context_kind_created_at_ms_idx', ['env', 'contextKind', 'createdAtMs'])
@Index('feedback_env_kind_created_at_ms_idx', ['env', 'kind', 'createdAtMs'])
@Index('feedback_env_anon_author_created_at_ms_idx', ['env', 'anonAuthorKey', 'createdAtMs'])
@Index('feedback_context_ref_idx', ['contextRef'])
@Check(
    'feedback_non_empty',
    `"message" IS NOT NULL OR "rating_utility" IS NOT NULL OR "rating_clarity" IS NOT NULL OR "rating_experience" IS NOT NULL`
)
@Check('feedback_created_at_ms_positive', `"created_at_ms" > 0`)
@Index('feedback_status_idx', ['status'])
@Index('feedback_env_status_created_at_ms_idx', ['env', 'status', 'createdAtMs'])
export class Feedback {

    @PrimaryColumn('uuid')
    id: UUID

    @Column({ name: 'created_at_ms', type: 'bigint' })
    createdAtMs: string

    @Exclude()
    userId: UUID /* SOLO TRANSIENT, NON viene persistito, serve solo per generare il anonAuthorKey direttamente dentro l'entità in onInsert
     senza che l'entità debba dipendere da un contesto di iniezione esterno */

    @Column({ type: 'enum', enum: FeedbackEnv })
    env: FeedbackEnv

    @Column({
        type: 'enum',
        enum: FeedbackSource,
        default: FeedbackSource.MANUAL_PAGE
    })
    source: FeedbackSource

    @Column({
        type: 'enum',
        enum: FeedbackKind,
        default: FeedbackKind.OTHER
    })
    kind: FeedbackKind

    @Exclude()
    @Column({ name: 'anon_author_key', type: 'text' })
    anonAuthorKey: string

    @Column({ name: 'rating_utility', type: 'smallint', nullable: true })
    ratingUtility: number | null

    @Column({ name: 'rating_clarity', type: 'smallint', nullable: true })
    ratingClarity: number | null

    @Column({ name: 'rating_experience', type: 'smallint', nullable: true })
    ratingExperience: number | null

    @Column({ type: 'text', nullable: true })
    message: string | null

    @Column({
        name: 'context_kind',
        type: 'enum',
        enum: FeedbackContextKind,
        default: FeedbackContextKind.GLOBAL
    })
    contextKind: FeedbackContextKind

    @Column({ name: 'context_ref', type: 'text', nullable: true })
    contextRef: string | null

    @Column({ name: 'context_meta', type: 'jsonb', nullable: true })
    contextMeta: Record<string, unknown> | null

    @Column({ name: 'client_version', type: 'text', nullable: true })
    clientVersion: string | null

    @Column({
        type: 'enum',
        enum: FeedbackStatus,
        default: FeedbackStatus.NEW
    })
    status: FeedbackStatus

    @Column({ name: 'internal_note', type: 'text', nullable: true })
    internalNote: string | null

    @Column({ type: 'text', array: true, nullable: true })
    tags: string[] | null

    @BeforeInsert()
    private onInsert(): void {
        this.id = uuidv7() as UUID
        this.createdAtMs = Date.now().toString()
        this.anonAuthorKey = generateAnonAuthorKey(this.userId)
    }

}
