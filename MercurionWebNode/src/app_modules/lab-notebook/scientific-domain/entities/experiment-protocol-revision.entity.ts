import { UUID } from 'crypto'
import { Field, ID, Int, ObjectType } from '@nestjs/graphql'
import { GraphQLJSONObject } from 'graphql-type-json'
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, Unique } from 'typeorm'
import { NotebookExperiment } from './notebook-experiment.entity'
import { ExperimentExecution } from './experiment-execution.entity'

/** Append-only, versioned snapshot; creation handled by a single backend UoW. */
@ObjectType()
@Entity('lab_experiment_protocol_revisions')
@Index('idx_protocol_revisions_owner_experiment', ['userId', 'experimentId'])
@Unique('uq_protocol_revision_number', ['experimentId', 'revisionNumber'])
export class ExperimentProtocolRevision {
  @Field(() => ID)
  @PrimaryColumn({ type: 'uuid' })
  id!: UUID

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: UUID

  @Field(() => ID)
  @Column({ name: 'experiment_id', type: 'uuid' })
  experimentId!: UUID

  @Field(() => NotebookExperiment)
  @ManyToOne(() => NotebookExperiment, experiment => experiment.protocolRevisions, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'experiment_id' })
  experiment!: NotebookExperiment

  @Field(() => Int)
  @Column({ name: 'revision_number', type: 'int' })
  revisionNumber!: number

  @Field(() => Int)
  @Column({ name: 'snapshot_schema_version', type: 'int', default: 1 })
  snapshotSchemaVersion!: number

  @Field(() => GraphQLJSONObject)
  @Column({ type: 'jsonb' })
  snapshot!: Record<string, unknown>

  @Field()
  @Column({ name: 'checksum_sha256', type: 'char', length: 64 })
  checksumSha256!: string

  @Field(() => String)
  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: number

  @Column({ name: 'created_by', type: 'uuid' })
  createdBy!: UUID

  @OneToMany(() => ExperimentExecution, execution => execution.protocolRevision)
  executions!: ExperimentExecution[]
}
