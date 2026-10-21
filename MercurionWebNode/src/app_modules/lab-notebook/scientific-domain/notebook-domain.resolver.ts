import { UUID } from 'crypto'
import {
  Args, ID, Mutation, Parent, Query, ResolveField, Resolver
} from '@nestjs/graphql'
import { AuthenticatedUserId } from 'src/metadata/metadata'
import { assertMercurionPublicId } from 'src/identifiers/mercurion-public-id'
import { NotebookDomainService } from './notebook-domain.service'
import { ExperimentProtocolService } from './experiment-protocol.service'
import { LabNotebook } from './entities/lab-notebook.entity'
import { NotebookSection } from './entities/notebook-section.entity'
import { NotebookExperiment } from './entities/notebook-experiment.entity'
import { ExperimentExecution } from './entities/experiment-execution.entity'
import { ExperimentProtocolRevision } from './entities/experiment-protocol-revision.entity'
import {
  ExperimentExecutionCreateInput, ExperimentExecutionPatchInput,
  NotebookExperimentCreateInput, NotebookExperimentPatchInput,
  NotebookSectionCreateInput, NotebookSectionPatchInput,
  NotebookOrderInput, ScientificNotebookCreateInput, ScientificNotebookPatchInput,
  ExperimentSynthesisLinkInput, ExecutionSynthesisLinkInput, ExecutionMoleculeLinkInput
} from './dto/notebook-domain.inputs'

function ownerId(raw: string, label = 'id'): UUID {
  assertMercurionPublicId(raw, label)
  return raw as UUID
}

function reorderedIds(input: NotebookOrderInput): UUID[] {
  return input.orderedIds.map((id, i) => ownerId(id, `orderedIds[${i}]`))
}

@Resolver(() => LabNotebook)
export class LabNotebookDomainResolver {
  constructor(private readonly notebook: NotebookDomainService) {}

  @Query(() => [LabNotebook])
  async labNotebooksByUser(@AuthenticatedUserId() userId: UUID): Promise<LabNotebook[]> {
    return this.notebook.listNotebooks(userId)
  }

  @Query(() => LabNotebook, { nullable: true })
  async labNotebook(
    @Args('id', { type: () => ID }) id: string,
    @AuthenticatedUserId() userId: UUID
  ): Promise<LabNotebook> {
    return this.notebook.findNotebook(userId, ownerId(id))
  }

  @Mutation(() => LabNotebook)
  async createLabNotebook(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: ScientificNotebookCreateInput
  ): Promise<LabNotebook> {
    return this.notebook.createNotebook(userId, input)
  }

  @Mutation(() => LabNotebook)
  async updateLabNotebook(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: ScientificNotebookPatchInput
  ): Promise<LabNotebook> {
    ownerId(input.id)
    return this.notebook.patchNotebook(userId, input)
  }

  @Mutation(() => LabNotebook)
  async archiveLabNotebook(
    @AuthenticatedUserId() userId: UUID,
    @Args('id', { type: () => ID }) id: string
  ): Promise<LabNotebook> {
    return this.notebook.archiveNotebook(userId, ownerId(id))
  }

  @ResolveField(() => [NotebookSection])
  async sections(@Parent() notebook: LabNotebook): Promise<NotebookSection[]> {
    return this.notebook.listSections(notebook.userId, notebook.id)
  }
}

@Resolver(() => NotebookSection)
export class NotebookSectionDomainResolver {
  constructor(private readonly notebookService: NotebookDomainService) {}

  @Query(() => [NotebookSection])
  async notebookSections(
    @AuthenticatedUserId() userId: UUID,
    @Args('notebookId', { type: () => ID }) notebookId: string
  ): Promise<NotebookSection[]> {
    return this.notebookService.listSections(userId, ownerId(notebookId, 'notebookId'))
  }

  @Query(() => NotebookSection, { nullable: true })
  async notebookSection(
    @AuthenticatedUserId() userId: UUID,
    @Args('id', { type: () => ID }) id: string
  ): Promise<NotebookSection> {
    return this.notebookService.findSection(userId, ownerId(id))
  }

  @Mutation(() => NotebookSection)
  async createNotebookSection(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: NotebookSectionCreateInput
  ): Promise<NotebookSection> {
    ownerId(input.notebookId, 'notebookId')
    return this.notebookService.createSection(userId, input)
  }

  @Mutation(() => NotebookSection)
  async updateNotebookSection(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: NotebookSectionPatchInput
  ): Promise<NotebookSection> {
    ownerId(input.id)
    return this.notebookService.patchSection(userId, input)
  }

  @Mutation(() => Boolean)
  async reorderNotebookSections(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: NotebookOrderInput
  ): Promise<boolean> {
    return this.notebookService.reorderSections(userId, ownerId(input.parentId, 'parentId'), reorderedIds(input))
  }

  @ResolveField(() => LabNotebook)
  async notebook(@Parent() section: NotebookSection): Promise<LabNotebook> {
    return this.notebookService.findNotebook(section.userId, section.notebookId)
  }

  @ResolveField(() => [NotebookExperiment])
  async experiments(@Parent() section: NotebookSection): Promise<NotebookExperiment[]> {
    return this.notebookService.listExperiments(section.userId, section.id)
  }
}

@Resolver(() => NotebookExperiment)
export class NotebookExperimentDomainResolver {
  constructor(
    private readonly notebook: NotebookDomainService,
    private readonly protocols: ExperimentProtocolService
  ) {}

  @Query(() => [NotebookExperiment])
  async notebookExperiments(
    @AuthenticatedUserId() userId: UUID,
    @Args('sectionId', { type: () => ID }) sectionId: string
  ): Promise<NotebookExperiment[]> {
    return this.notebook.listExperiments(userId, ownerId(sectionId, 'sectionId'))
  }

  @Query(() => NotebookExperiment, { nullable: true })
  async notebookExperiment(
    @AuthenticatedUserId() userId: UUID,
    @Args('id', { type: () => ID }) id: string
  ): Promise<NotebookExperiment> {
    return this.notebook.findExperiment(userId, ownerId(id))
  }

  @Mutation(() => NotebookExperiment)
  async createNotebookExperiment(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: NotebookExperimentCreateInput
  ): Promise<NotebookExperiment> {
    ownerId(input.sectionId, 'sectionId')
    return this.notebook.createExperiment(userId, input)
  }

  @Mutation(() => NotebookExperiment)
  async updateNotebookExperiment(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: NotebookExperimentPatchInput
  ): Promise<NotebookExperiment> {
    ownerId(input.id)
    return this.notebook.patchExperiment(userId, input)
  }

  @Mutation(() => NotebookExperiment)
  async archiveNotebookExperiment(
    @AuthenticatedUserId() userId: UUID,
    @Args('id', { type: () => ID }) id: string
  ): Promise<NotebookExperiment> {
    return this.notebook.archiveExperiment(userId, ownerId(id))
  }

  @Mutation(() => Boolean)
  async reorderNotebookExperiments(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: NotebookOrderInput
  ): Promise<boolean> {
    return this.notebook.reorderExperiments(userId, ownerId(input.parentId, 'parentId'), reorderedIds(input))
  }

  @Mutation(() => Boolean)
  async linkSynthesisToExperiment(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: ExperimentSynthesisLinkInput
  ): Promise<boolean> {
    ownerId(input.experimentId, 'experimentId')
    ownerId(input.synthesisId, 'synthesisId')
    return this.protocols.linkSynthesisToExperiment(userId, input)
  }

  @Mutation(() => Boolean)
  async unlinkSynthesisFromExperiment(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: ExperimentSynthesisLinkInput
  ): Promise<boolean> {
    ownerId(input.experimentId, 'experimentId')
    ownerId(input.synthesisId, 'synthesisId')
    return this.protocols.unlinkSynthesisFromExperiment(userId, input)
  }

  @ResolveField(() => NotebookSection)
  async section(@Parent() experiment: NotebookExperiment): Promise<NotebookSection> {
    return this.notebook.findSection(experiment.userId, experiment.sectionId)
  }

  @ResolveField(() => [ExperimentExecution])
  async executions(@Parent() experiment: NotebookExperiment): Promise<ExperimentExecution[]> {
    return this.notebook.listExecutions(experiment.userId, experiment.id)
  }

  @ResolveField(() => [ExperimentProtocolRevision])
  async protocolRevisions(@Parent() experiment: NotebookExperiment): Promise<ExperimentProtocolRevision[]> {
    return this.notebook.listRevisions(experiment.userId, experiment.id)
  }
}

@Resolver(() => ExperimentExecution)
export class ExperimentExecutionDomainResolver {
  constructor(
    private readonly notebook: NotebookDomainService,
    private readonly protocols: ExperimentProtocolService
  ) {}

  @Query(() => [ExperimentExecution])
  async experimentExecutions(
    @AuthenticatedUserId() userId: UUID,
    @Args('experimentId', { type: () => ID }) experimentId: string
  ): Promise<ExperimentExecution[]> {
    return this.notebook.listExecutions(userId, ownerId(experimentId, 'experimentId'))
  }

  @Query(() => ExperimentExecution, { nullable: true })
  async experimentExecution(
    @AuthenticatedUserId() userId: UUID,
    @Args('id', { type: () => ID }) id: string
  ): Promise<ExperimentExecution> {
    return this.notebook.findExecution(userId, ownerId(id))
  }

  @Mutation(() => ExperimentExecution)
  async createExperimentExecution(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: ExperimentExecutionCreateInput
  ): Promise<ExperimentExecution> {
    ownerId(input.experimentId, 'experimentId')
    return this.notebook.createExecution(userId, input)
  }

  @Mutation(() => ExperimentExecution)
  async updateExperimentExecution(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: ExperimentExecutionPatchInput
  ): Promise<ExperimentExecution> {
    ownerId(input.id)
    return this.notebook.patchExecution(userId, input)
  }

  @Mutation(() => ExperimentExecution)
  async startExperimentExecution(
    @AuthenticatedUserId() userId: UUID,
    @Args('id', { type: () => ID }) id: string
  ): Promise<ExperimentExecution> {
    return this.protocols.start(userId, ownerId(id))
  }

  @Mutation(() => ExperimentExecution)
  async completeExperimentExecution(
    @AuthenticatedUserId() userId: UUID,
    @Args('id', { type: () => ID }) id: string
  ): Promise<ExperimentExecution> {
    return this.protocols.complete(userId, ownerId(id))
  }

  @Mutation(() => ExperimentExecution)
  async cancelExperimentExecution(
    @AuthenticatedUserId() userId: UUID,
    @Args('id', { type: () => ID }) id: string
  ): Promise<ExperimentExecution> {
    return this.protocols.cancel(userId, ownerId(id))
  }

  @Mutation(() => ExperimentExecution)
  async archiveExperimentExecution(
    @AuthenticatedUserId() userId: UUID,
    @Args('id', { type: () => ID }) id: string
  ): Promise<ExperimentExecution> {
    return this.notebook.archiveExecution(userId, ownerId(id))
  }

  @Mutation(() => Boolean)
  async reorderExperimentExecutions(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: NotebookOrderInput
  ): Promise<boolean> {
    return this.notebook.reorderExecutions(userId, ownerId(input.parentId, 'parentId'), reorderedIds(input))
  }

  @Mutation(() => Boolean)
  async linkSynthesisToExecution(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: ExecutionSynthesisLinkInput
  ): Promise<boolean> {
    ownerId(input.executionId, 'executionId')
    ownerId(input.synthesisId, 'synthesisId')
    if (input.stepId) ownerId(input.stepId, 'stepId')
    return this.protocols.linkSynthesisToExecution(userId, input)
  }

  @Mutation(() => Boolean)
  async linkMoleculeToExecution(
    @AuthenticatedUserId() userId: UUID,
    @Args('input') input: ExecutionMoleculeLinkInput
  ): Promise<boolean> {
    ownerId(input.executionId, 'executionId')
    ownerId(input.moleculeId, 'moleculeId')
    return this.protocols.linkMoleculeToExecution(userId, input)
  }

  @ResolveField(() => NotebookExperiment)
  async experiment(@Parent() execution: ExperimentExecution): Promise<NotebookExperiment> {
    return this.notebook.findExperiment(execution.userId, execution.experimentId)
  }

  @ResolveField(() => ExperimentProtocolRevision, { nullable: true })
  async protocolRevision(@Parent() execution: ExperimentExecution): Promise<ExperimentProtocolRevision | null> {
    if (!execution.protocolRevisionId) return null
    return this.notebook.findRevision(execution.userId, execution.protocolRevisionId)
  }
}

@Resolver(() => ExperimentProtocolRevision)
export class ExperimentProtocolRevisionDomainResolver {
  constructor(private readonly notebook: NotebookDomainService) {}

  @Query(() => [ExperimentProtocolRevision])
  async experimentProtocolRevisions(
    @AuthenticatedUserId() userId: UUID,
    @Args('experimentId', { type: () => ID }) experimentId: string
  ): Promise<ExperimentProtocolRevision[]> {
    return this.notebook.listRevisions(userId, ownerId(experimentId, 'experimentId'))
  }

  @Query(() => ExperimentProtocolRevision, { nullable: true })
  async experimentProtocolRevision(
    @AuthenticatedUserId() userId: UUID,
    @Args('id', { type: () => ID }) id: string
  ): Promise<ExperimentProtocolRevision> {
    return this.notebook.findRevision(userId, ownerId(id))
  }

  @ResolveField(() => NotebookExperiment)
  async experiment(@Parent() revision: ExperimentProtocolRevision): Promise<NotebookExperiment> {
    return this.notebook.findExperiment(revision.userId, revision.experimentId)
  }
}
