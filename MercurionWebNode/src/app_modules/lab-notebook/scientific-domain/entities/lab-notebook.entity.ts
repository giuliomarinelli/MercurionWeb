import { UUID } from 'crypto'
import { uuidv7 } from '@kripod/uuidv7'
import { Field, ID, ObjectType } from '@nestjs/graphql'
import { GraphQLJSONObject } from 'graphql-type-json'
import { BeforeInsert, Column, Entity, Index, OneToMany, PrimaryColumn } from 'typeorm'
import { NotebookSection } from './notebook-section.entity'

/** Scientific Notebook v1. Registered only after coordinated DB-first cutover. */
@ObjectType()
@Entity('lab_notebooks')
@Index('idx_lab_notebooks_owner', ['userId'])
export class LabNotebook {
  @Field(() => ID)
  @PrimaryColumn({ type: 'uuid' })
  id!: UUID

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: UUID

  @Field()
  @Column({ type: 'varchar', length: 255 })
  title!: string

  @Field(() => GraphQLJSONObject, { nullable: true })
  @Column({ name: 'premise_delta', type: 'jsonb', nullable: true })
  premiseDelta!: Record<string, unknown> | null

  @Field()
  @Column({ name: 'premise_text', type: 'text', default: '' })
  premiseText!: string

  @Field(() => [NotebookSection])
  @OneToMany(() => NotebookSection, section => section.notebook)
  sections!: NotebookSection[]

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
