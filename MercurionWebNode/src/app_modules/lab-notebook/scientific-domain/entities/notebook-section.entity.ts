import { UUID } from 'crypto'
import { uuidv7 } from '@kripod/uuidv7'
import { Field, ID, Int, ObjectType } from '@nestjs/graphql'
import { GraphQLJSONObject } from 'graphql-type-json'
import { BeforeInsert, Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, Unique } from 'typeorm'
import { LabNotebook } from './lab-notebook.entity'
import { NotebookExperiment } from './notebook-experiment.entity'

/** Theme-based group of experiments; supersedes the legacy NotebookChapter. */
@ObjectType()
@Entity('lab_notebook_sections')
@Index('idx_notebook_sections_owner_parent', ['userId', 'notebookId'])
@Unique('uq_notebook_section_order', ['notebookId', 'sectionOrder'])
export class NotebookSection {
  @Field(() => ID)
  @PrimaryColumn({ type: 'uuid' })
  id!: UUID

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: UUID

  @Field(() => ID)
  @Column({ name: 'notebook_id', type: 'uuid' })
  notebookId!: UUID

  @Field(() => LabNotebook)
  @ManyToOne(() => LabNotebook, notebook => notebook.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notebook_id' })
  notebook!: LabNotebook

  @Field()
  @Column({ type: 'varchar', length: 255 })
  title!: string

  @Field(() => Int)
  @Column({ name: 'section_order', type: 'int' })
  sectionOrder!: number

  @Field(() => GraphQLJSONObject, { nullable: true })
  @Column({ name: 'content_delta', type: 'jsonb', nullable: true })
  contentDelta!: Record<string, unknown> | null

  @Field()
  @Column({ name: 'sanitized_text', type: 'text', default: '' })
  sanitizedText!: string

  @Field(() => [NotebookExperiment])
  @OneToMany(() => NotebookExperiment, experiment => experiment.section)
  experiments!: NotebookExperiment[]

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
