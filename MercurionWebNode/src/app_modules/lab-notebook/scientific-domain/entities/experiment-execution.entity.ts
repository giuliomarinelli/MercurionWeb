import { UUID } from 'crypto'
import { uuidv7 } from '@kripod/uuidv7'
import { Field, ID, Int, ObjectType } from '@nestjs/graphql'
import { GraphQLJSONObject } from 'graphql-type-json'
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm'
import { NotebookExperiment } from './notebook-experiment.entity'
import { ExperimentProtocolRevision } from './experiment-protocol-revision.entity'

export type ExperimentExecutionStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

/** Concrete attempt; protocol binding is frozen once the run starts. */
@ObjectType()
@Entity('lab_notebook_executions')
@Index('idx_executions_owner_experiment', ['userId', 'experimentId'])
@Unique('uq_execution_order', ['experimentId', 'executionOrder'])
export class ExperimentExecution {
  @Field(() => ID)
  @PrimaryColumn({ type: 'uuid' })
  id!: UUID

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: UUID

  @Field(() => ID)
  @Column({ name: 'experiment_id', type: 'uuid' })
  experimentId!: UUID

  @Field(() => NotebookExperiment)
  @ManyToOne(() => NotebookExperiment, experiment => experiment.executions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'experiment_id' })
  experiment!: NotebookExperiment

  @Field(() => ID, { nullable: true })
  @Column({ name: 'protocol_revision_id', type: 'uuid', nullable: true })
  protocolRevisionId!: UUID | null

  @Field(() => ExperimentProtocolRevision, { nullable: true })
  @ManyToOne(() => ExperimentProtocolRevision, revision => revision.executions, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'protocol_revision_id' })
  protocolRevision!: ExperimentProtocolRevision | null

  @Field()
  @Column({ type: 'varchar', length: 255 })
  title!: string

  @Field(() => Int)
  @Column({ name: 'execution_order', type: 'int' })
  executionOrder!: number

  @Field()
  @Column({ type: 'varchar', length: 16, default: 'DRAFT' })
  status!: ExperimentExecutionStatus

  @Field(() => GraphQLJSONObject, { nullable: true })
  @Column({ name: 'content_delta', type: 'jsonb', nullable: true })
  contentDelta!: Record<string, unknown> | null

  @Field()
  @Column({ name: 'sanitized_text', type: 'text', default: '' })
  sanitizedText!: string

  @Field(() => String, { nullable: true })
  @Column({ name: 'started_at', type: 'bigint', nullable: true })
  startedAt!: number | null

  @Field(() => String, { nullable: true })
  @Column({ name: 'completed_at', type: 'bigint', nullable: true })
  completedAt!: number | null

  @Field(() => String, { nullable: true })
  @Column({ name: 'archived_at', type: 'bigint', nullable: true })
  archivedAt!: number | null

  @Field(() => String)
  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: number

  @Field(() => String)
  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: number

  @BeforeInsert()
  prepareInsert(): void {
    this.id ??= uuidv7() as UUID
    this.createdAt ??= Date.now()
    this.updatedAt ??= this.createdAt
  }
}
