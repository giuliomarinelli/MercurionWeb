import { UUID } from 'crypto'
import { uuidv7 } from '@kripod/uuidv7'
import { Field, ID, Int, ObjectType } from '@nestjs/graphql'
import { GraphQLJSONObject } from 'graphql-type-json'
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, Unique } from 'typeorm'
import { NotebookSection } from './notebook-section.entity'
import { ExperimentExecution } from './experiment-execution.entity'
import { ExperimentProtocolRevision } from './experiment-protocol-revision.entity'

/** Experimental plan and editable protocol draft; distinct from an actual run. */
@ObjectType()
@Entity('lab_notebook_experiments')
@Index('idx_notebook_experiments_owner_parent', ['userId', 'sectionId'])
@Unique('uq_notebook_experiment_order', ['sectionId', 'experimentOrder'])
export class NotebookExperiment {
  @Field(() => ID)
  @PrimaryColumn({ type: 'uuid' })
  id!: UUID

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: UUID

  @Field(() => ID)
  @Column({ name: 'section_id', type: 'uuid' })
  sectionId!: UUID

  @Field(() => NotebookSection)
  @ManyToOne(() => NotebookSection, section => section.experiments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'section_id' })
  section!: NotebookSection

  @Field()
  @Column({ type: 'varchar', length: 255 })
  title!: string

  @Field(() => Int)
  @Column({ name: 'experiment_order', type: 'int' })
  experimentOrder!: number

  @Field(() => GraphQLJSONObject, { nullable: true })
  @Column({ name: 'content_delta', type: 'jsonb', nullable: true })
  contentDelta!: Record<string, unknown> | null

  @Field()
  @Column({ name: 'sanitized_text', type: 'text', default: '' })
  sanitizedText!: string

  @Field(() => [ExperimentExecution])
  @OneToMany(() => ExperimentExecution, execution => execution.experiment)
  executions!: ExperimentExecution[]

  @Field(() => [ExperimentProtocolRevision])
  @OneToMany(() => ExperimentProtocolRevision, revision => revision.experiment)
  protocolRevisions!: ExperimentProtocolRevision[]

  @Field(() => String)
  @Column({ name: 'created_at', type: 'bigint' })
  createdAt!: number

  @Field(() => String)
  @Column({ name: 'updated_at', type: 'bigint' })
  updatedAt!: number

  @Field(() => String, { nullable: true })
  @Column({ name: 'archived_at', type: 'bigint', nullable: true })
  archivedAt!: number | null

  @BeforeInsert()
  prepareInsert(): void {
    this.id ??= uuidv7() as UUID
    this.createdAt ??= Date.now()
    this.updatedAt ??= this.createdAt
  }
}
