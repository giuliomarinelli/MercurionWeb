import { Field, ID, InputType, Int } from '@nestjs/graphql'
import { GraphQLJSONObject } from 'graphql-type-json'
import { ArrayUnique, IsArray, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator'

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
  parentId!: string

  @Field(() => [ID])
  @IsArray()
  @ArrayUnique()
  orderedIds!: string[]
}

@InputType()
export class ExperimentSynthesisLinkInput {
  @Field(() => ID)
  experimentId!: string

  @Field(() => ID)
  synthesisId!: string
}

@InputType()
export class ExecutionSynthesisLinkInput {
  @Field(() => ID)
  executionId!: string

  @Field(() => ID)
  synthesisId!: string

  @Field(() => ID, { nullable: true })
  @IsOptional()
  stepId?: string | null
}

@InputType()
export class ExecutionMoleculeLinkInput {
  @Field(() => ID)
  executionId!: string

  @Field(() => ID)
  moleculeId!: string
}
