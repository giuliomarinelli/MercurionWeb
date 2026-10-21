import { Field, ID, InputType } from '@nestjs/graphql'
import { GraphQLJSONObject } from 'graphql-type-json'
import { ArrayUnique, IsArray, IsOptional, IsString, MaxLength } from 'class-validator'
import { IsMercurionPublicId } from 'src/identifiers/mercurion-public-id'

@InputType()
export class ScientificNotebookCreateInput {
  @Field()
  @IsString()
  @MaxLength(255)
  title!: string

  @Field(() => GraphQLJSONObject, { nullable: true })
  @IsOptional()
  premiseDelta?: Record<string, unknown> | null
}

@InputType()
export class ScientificNotebookPatchInput {
  @Field(() => ID)
  @IsMercurionPublicId()
  id!: string

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @Field(() => GraphQLJSONObject, { nullable: true })
  @IsOptional()
  premiseDelta?: Record<string, unknown> | null
}

@InputType()
export class NotebookSectionCreateInput {
  @Field(() => ID)
  @IsMercurionPublicId()
  notebookId!: string

  @Field()
  @IsString()
  @MaxLength(255)
  title!: string

  @Field(() => GraphQLJSONObject, { nullable: true })
  @IsOptional()
  contentDelta?: Record<string, unknown> | null
}

@InputType()
export class NotebookSectionPatchInput {
  @Field(() => ID)
  @IsMercurionPublicId()
  id!: string

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @Field(() => GraphQLJSONObject, { nullable: true })
  @IsOptional()
  contentDelta?: Record<string, unknown> | null
}

@InputType()
export class NotebookExperimentCreateInput {
  @Field(() => ID)
  @IsMercurionPublicId()
  sectionId!: string

  @Field()
  @IsString()
  @MaxLength(255)
  title!: string

  @Field(() => GraphQLJSONObject, { nullable: true })
  @IsOptional()
  contentDelta?: Record<string, unknown> | null
}

@InputType()
export class NotebookExperimentPatchInput {
  @Field(() => ID)
  @IsMercurionPublicId()
  id!: string

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @Field(() => GraphQLJSONObject, { nullable: true })
  @IsOptional()
  contentDelta?: Record<string, unknown> | null
}

@InputType()
export class ExperimentExecutionCreateInput {
  @Field(() => ID)
  @IsMercurionPublicId()
  experimentId!: string

  @Field()
  @IsString()
  @MaxLength(255)
  title!: string

  @Field(() => GraphQLJSONObject, { nullable: true })
  @IsOptional()
  contentDelta?: Record<string, unknown> | null
}

@InputType()
export class ExperimentExecutionPatchInput {
  @Field(() => ID)
  @IsMercurionPublicId()
  id!: string

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string

  @Field(() => GraphQLJSONObject, { nullable: true })
  @IsOptional()
  contentDelta?: Record<string, unknown> | null
}

@InputType()
export class NotebookOrderInput {
  @Field(() => ID)
  @IsMercurionPublicId()
  parentId!: string

  @Field(() => [ID])
  @IsArray()
  @ArrayUnique()
  @IsMercurionPublicId({ each: true })
  orderedIds!: string[]
}

@InputType()
export class ExperimentSynthesisLinkInput {
  @Field(() => ID)
  @IsMercurionPublicId()
  experimentId!: string

  @Field(() => ID)
  @IsMercurionPublicId()
  synthesisId!: string
}

@InputType()
export class ExecutionSynthesisLinkInput {
  @Field(() => ID)
  @IsMercurionPublicId()
  executionId!: string

  @Field(() => ID)
  @IsMercurionPublicId()
  synthesisId!: string

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsMercurionPublicId()
  stepId?: string | null
}

@InputType()
export class ExecutionMoleculeLinkInput {
  @Field(() => ID)
  @IsMercurionPublicId()
  executionId!: string

  @Field(() => ID)
  @IsMercurionPublicId()
  moleculeId!: string
}
