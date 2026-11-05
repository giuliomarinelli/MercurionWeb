import { runInTransaction } from 'src/persistence/transaction-context'
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { UUID } from 'crypto'
import { DataSource, EntityManager } from 'typeorm'
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity'
import { LabNotebook } from './entities/lab-notebook.entity'
import { NotebookSection } from './entities/notebook-section.entity'
import { NotebookExperiment } from './entities/notebook-experiment.entity'
import { ExperimentExecution } from './entities/experiment-execution.entity'
import { ExperimentProtocolRevision } from './entities/experiment-protocol-revision.entity'
import {
  ExperimentExecutionCreateInput, ExperimentExecutionPatchInput,
  NotebookExperimentCreateInput, NotebookExperimentPatchInput,
  NotebookSectionCreateInput, NotebookSectionPatchInput,
  ScientificNotebookCreateInput, ScientificNotebookPatchInput
} from './dto/notebook-domain.inputs'
import { requireNotebookTitle, validateNotebookDelta } from './notebook-delta'

/**
 * DB-first experimental notebook tree. All methods enforce user ownership,
 * while PostgreSQL intentionally uses simple ID foreign keys.
 */
@Injectable()
export class NotebookDomainService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async ownedNotebook(manager: EntityManager, userId: UUID, id: UUID): Promise<LabNotebook> {
    const row = await manager.findOne(LabNotebook, { where: { id, userId } })
    if (!row) throw new NotFoundException('LAB_NOTEBOOK_NOT_FOUND')
    return row
  }

  async ownedSection(manager: EntityManager, userId: UUID, id: UUID): Promise<NotebookSection> {
    const row = await manager.findOne(NotebookSection, { where: { id, userId } })
    if (!row) throw new NotFoundException('NOTEBOOK_SECTION_NOT_FOUND')
    // Weak FKs are intentional, but must not let a child from one user
    // point at a parent from a different user.
    const parent = await manager.exists(LabNotebook, {
      where: { id: row.notebookId, userId }
    })
    if (!parent) throw new NotFoundException('NOTEBOOK_SECTION_NOT_FOUND')
    return row
  }

  async ownedExperiment(manager: EntityManager, userId: UUID, id: UUID): Promise<NotebookExperiment> {
    const row = await manager.findOne(NotebookExperiment, { where: { id, userId } })
    if (!row) throw new NotFoundException('NOTEBOOK_EXPERIMENT_NOT_FOUND')
    await this.ownedSection(manager, userId, row.sectionId)
    return row
  }

  async ownedExecution(manager: EntityManager, userId: UUID, id: UUID): Promise<ExperimentExecution> {
    const row = await manager.findOne(ExperimentExecution, { where: { id, userId } })
    if (!row) throw new NotFoundException('EXPERIMENT_EXECUTION_NOT_FOUND')
    await this.ownedExperiment(manager, userId, row.experimentId)
    return row
  }

  private async lockedParent(
    manager: EntityManager, table: 'lab_notebooks' | 'lab_notebook_sections' | 'lab_notebook_experiments',
    id: UUID, userId: UUID
  ): Promise<void> {
    // Table name comes exclusively from this static union; user-supplied IDs
    // always remain bound parameters.
    const rows: Array<{ id: UUID }> = await manager.query(
      `SELECT id FROM public.${table} WHERE id=$1::uuid AND user_id=$2::uuid FOR UPDATE`,
      [id, userId]
    )
    if (rows.length !== 1) throw new NotFoundException('NOTEBOOK_PARENT_NOT_FOUND')
  }

  private async nextOrder(
    manager: EntityManager,
    table: 'lab_notebook_sections' | 'lab_notebook_experiments' | 'lab_notebook_executions',
    parentColumn: 'notebook_id' | 'section_id' | 'experiment_id',
    orderColumn: 'section_order' | 'experiment_order' | 'execution_order',
    parentId: UUID,
    userId: UUID
  ): Promise<number> {
    const rows: Array<{ next: number }> = await manager.query(
      `SELECT COALESCE(MAX(${orderColumn}), -1)+1 AS next
       FROM public.${table} WHERE ${parentColumn}=$1::uuid AND user_id=$2::uuid`,
      [parentId, userId]
    )
    const next = Number(rows[0]?.next)
    if (!Number.isSafeInteger(next) || next > 2147483647) {
      throw new ConflictException('NOTEBOOK_ORDER_EXHAUSTED')
    }
    return next
  }

  async listNotebooks(userId: UUID): Promise<LabNotebook[]> {
    return this.dataSource.getRepository(LabNotebook).find({
      where: { userId },
      order: { createdAt: 'DESC', id: 'ASC' }
    })
  }

  async findNotebook(userId: UUID, id: UUID): Promise<LabNotebook> {
    return this.ownedNotebook(this.dataSource.manager, userId, id)
  }

  async createNotebook(userId: UUID, input: ScientificNotebookCreateInput): Promise<LabNotebook> {
    const title = requireNotebookTitle(input.title)
    const premise = validateNotebookDelta(input.premiseDelta)
    const repo = this.dataSource.getRepository(LabNotebook)
    return repo.save(repo.create({
      userId, title, premiseDelta: premise.delta, premiseText: premise.sanitizedText,
      archivedAt: null
    }))
  }

  async patchNotebook(userId: UUID, input: ScientificNotebookPatchInput): Promise<LabNotebook> {
    const id = input.id as UUID
    return runInTransaction(this.dataSource, async (_context, manager) => {
      const existing = await this.ownedNotebook(manager, userId, id)
      if (existing.archivedAt != null) throw new ConflictException('LAB_NOTEBOOK_ARCHIVED')
      const patch: QueryDeepPartialEntity<LabNotebook> = { updatedAt: Date.now() }
      if (input.title !== undefined) patch.title = requireNotebookTitle(input.title)
      if (input.premiseDelta !== undefined) {
        const value = validateNotebookDelta(input.premiseDelta)
        // TypeORM recursively maps unknown JSON values, but jsonb is written as a whole.
        patch.premiseDelta = value.delta as QueryDeepPartialEntity<LabNotebook>['premiseDelta']
        patch.premiseText = value.sanitizedText
      }
      await manager.update(LabNotebook, { id, userId }, patch)
      return this.ownedNotebook(manager, userId, id)
    })
  }

  async archiveNotebook(userId: UUID, id: UUID): Promise<LabNotebook> {
    await this.ownedNotebook(this.dataSource.manager, userId, id)
    await this.dataSource.manager.update(LabNotebook, { id, userId }, {
      archivedAt: Date.now(), updatedAt: Date.now()
    })
    return this.findNotebook(userId, id)
  }

  async listSections(userId: UUID, notebookId: UUID): Promise<NotebookSection[]> {
    await this.findNotebook(userId, notebookId)
    return this.dataSource.getRepository(NotebookSection).find({
      where: { notebookId, userId },
      order: { sectionOrder: 'ASC', id: 'ASC' }
    })
  }

  async findSection(userId: UUID, id: UUID): Promise<NotebookSection> {
    return this.ownedSection(this.dataSource.manager, userId, id)
  }

  async createSection(userId: UUID, input: NotebookSectionCreateInput): Promise<NotebookSection> {
    const notebookId = input.notebookId as UUID
    const title = requireNotebookTitle(input.title)
    const value = validateNotebookDelta(input.contentDelta)
    return runInTransaction(this.dataSource, async (_context, manager) => {
      await this.lockedParent(manager, 'lab_notebooks', notebookId, userId)
      const notebook = await this.ownedNotebook(manager, userId, notebookId)
      if (notebook.archivedAt != null) throw new ConflictException('LAB_NOTEBOOK_ARCHIVED')
      const sectionOrder = await this.nextOrder(
        manager, 'lab_notebook_sections', 'notebook_id', 'section_order', notebookId, userId
      )
      return manager.save(NotebookSection, manager.create(NotebookSection, {
        userId, notebookId, title, sectionOrder,
        contentDelta: value.delta, sanitizedText: value.sanitizedText
      }))
    })
  }

  async patchSection(userId: UUID, input: NotebookSectionPatchInput): Promise<NotebookSection> {
    const id = input.id as UUID
    return runInTransaction(this.dataSource, async (_context, manager) => {
      await this.ownedSection(manager, userId, id)
      const patch: QueryDeepPartialEntity<NotebookSection> = { updatedAt: Date.now() }
      if (input.title !== undefined) patch.title = requireNotebookTitle(input.title)
      if (input.contentDelta !== undefined) {
        const value = validateNotebookDelta(input.contentDelta)
        patch.contentDelta = value.delta as QueryDeepPartialEntity<NotebookSection>['contentDelta']
        patch.sanitizedText = value.sanitizedText
      }
      await manager.update(NotebookSection, { id, userId }, patch)
      return this.ownedSection(manager, userId, id)
    })
  }

  async listExperiments(userId: UUID, sectionId: UUID): Promise<NotebookExperiment[]> {
    await this.findSection(userId, sectionId)
    return this.dataSource.getRepository(NotebookExperiment).find({
      where: { sectionId, userId },
      order: { experimentOrder: 'ASC', id: 'ASC' }
    })
  }

  async findExperiment(userId: UUID, id: UUID): Promise<NotebookExperiment> {
    return this.ownedExperiment(this.dataSource.manager, userId, id)
  }

  async createExperiment(userId: UUID, input: NotebookExperimentCreateInput): Promise<NotebookExperiment> {
    const sectionId = input.sectionId as UUID
    const title = requireNotebookTitle(input.title)
    const value = validateNotebookDelta(input.contentDelta)
    return runInTransaction(this.dataSource, async (_context, manager) => {
      await this.lockedParent(manager, 'lab_notebook_sections', sectionId, userId)
      const experimentOrder = await this.nextOrder(
        manager, 'lab_notebook_experiments', 'section_id', 'experiment_order', sectionId, userId
      )
      return manager.save(NotebookExperiment, manager.create(NotebookExperiment, {
        userId, sectionId, title, experimentOrder, archivedAt: null,
        contentDelta: value.delta, sanitizedText: value.sanitizedText
      }))
    })
  }

  async patchExperiment(userId: UUID, input: NotebookExperimentPatchInput): Promise<NotebookExperiment> {
    const id = input.id as UUID
    return runInTransaction(this.dataSource, async (_context, manager) => {
      const experiment = await this.ownedExperiment(manager, userId, id)
      if (experiment.archivedAt != null) throw new ConflictException('NOTEBOOK_EXPERIMENT_ARCHIVED')
      const patch: QueryDeepPartialEntity<NotebookExperiment> = { updatedAt: Date.now() }
      if (input.title !== undefined) patch.title = requireNotebookTitle(input.title)
      if (input.contentDelta !== undefined) {
        const value = validateNotebookDelta(input.contentDelta)
        patch.contentDelta = value.delta as QueryDeepPartialEntity<NotebookExperiment>['contentDelta']
        patch.sanitizedText = value.sanitizedText
      }
      await manager.update(NotebookExperiment, { id, userId }, patch)
      return this.ownedExperiment(manager, userId, id)
    })
  }

  async archiveExperiment(userId: UUID, id: UUID): Promise<NotebookExperiment> {
    await this.findExperiment(userId, id)
    await this.dataSource.manager.update(NotebookExperiment, { id, userId }, {
      archivedAt: Date.now(), updatedAt: Date.now()
    })
    return this.findExperiment(userId, id)
  }

  async listExecutions(userId: UUID, experimentId: UUID): Promise<ExperimentExecution[]> {
    await this.findExperiment(userId, experimentId)
    return this.dataSource.getRepository(ExperimentExecution).find({
      where: { experimentId, userId },
      order: { executionOrder: 'ASC', id: 'ASC' }
    })
  }

  async findExecution(userId: UUID, id: UUID): Promise<ExperimentExecution> {
    return this.ownedExecution(this.dataSource.manager, userId, id)
  }

  async createExecution(userId: UUID, input: ExperimentExecutionCreateInput): Promise<ExperimentExecution> {
    const experimentId = input.experimentId as UUID
    const title = requireNotebookTitle(input.title)
    const value = validateNotebookDelta(input.contentDelta)
    return runInTransaction(this.dataSource, async (_context, manager) => {
      await this.lockedParent(manager, 'lab_notebook_experiments', experimentId, userId)
      const experiment = await this.ownedExperiment(manager, userId, experimentId)
      if (experiment.archivedAt != null) throw new ConflictException('NOTEBOOK_EXPERIMENT_ARCHIVED')
      const executionOrder = await this.nextOrder(
        manager, 'lab_notebook_executions', 'experiment_id', 'execution_order', experimentId, userId
      )
      return manager.save(ExperimentExecution, manager.create(ExperimentExecution, {
        userId, experimentId, title, executionOrder,
        status: 'DRAFT', protocolRevisionId: null,
        contentDelta: value.delta, sanitizedText: value.sanitizedText,
        startedAt: null, completedAt: null, archivedAt: null
      }))
    })
  }

  async patchExecution(userId: UUID, input: ExperimentExecutionPatchInput): Promise<ExperimentExecution> {
    const id = input.id as UUID
    return runInTransaction(this.dataSource, async (_context, manager) => {
      // Serialize edits with complete/cancel/start; avoids converting a
      // predictable conflict into a database trigger error (SQLSTATE 23514).
      await manager.query(
        `SELECT id FROM public.lab_notebook_executions
         WHERE id=$1::uuid AND user_id=$2::uuid FOR UPDATE`,
        [id, userId]
      )
      const execution = await this.ownedExecution(manager, userId, id)
      if (execution.archivedAt != null ||
          execution.status === 'COMPLETED' || execution.status === 'CANCELLED') {
        throw new ConflictException('EXPERIMENT_EXECUTION_FINALIZED')
      }
      const patch: QueryDeepPartialEntity<ExperimentExecution> = { updatedAt: Date.now() }
      if (input.title !== undefined) patch.title = requireNotebookTitle(input.title)
      if (input.contentDelta !== undefined) {
        const value = validateNotebookDelta(input.contentDelta)
        patch.contentDelta = value.delta as QueryDeepPartialEntity<ExperimentExecution>['contentDelta']
        patch.sanitizedText = value.sanitizedText
      }
      await manager.update(ExperimentExecution, { id, userId }, patch)
      return this.ownedExecution(manager, userId, id)
    })
  }

  async archiveExecution(userId: UUID, id: UUID): Promise<ExperimentExecution> {
    await this.findExecution(userId, id)
    await this.dataSource.manager.update(ExperimentExecution, { id, userId }, {
      archivedAt: Date.now(), updatedAt: Date.now()
    })
    return this.findExecution(userId, id)
  }

  async listRevisions(userId: UUID, experimentId: UUID): Promise<ExperimentProtocolRevision[]> {
    await this.findExperiment(userId, experimentId)
    return this.dataSource.getRepository(ExperimentProtocolRevision).find({
      where: { experimentId, userId },
      order: { revisionNumber: 'ASC' }
    })
  }

  async findRevision(userId: UUID, id: UUID): Promise<ExperimentProtocolRevision> {
    const revision = await this.dataSource.manager.findOne(ExperimentProtocolRevision, {
      where: { id, userId }
    })
    if (!revision) throw new NotFoundException('EXPERIMENT_PROTOCOL_REVISION_NOT_FOUND')
    await this.ownedExperiment(this.dataSource.manager, userId, revision.experimentId)
    return revision
  }

  private async reorder(
    userId: UUID, parentId: UUID, ids: UUID[],
    parentTable: 'lab_notebooks' | 'lab_notebook_sections' | 'lab_notebook_experiments',
    table: 'lab_notebook_sections' | 'lab_notebook_experiments' | 'lab_notebook_executions',
    parentColumn: 'notebook_id' | 'section_id' | 'experiment_id',
    orderColumn: 'section_order' | 'experiment_order' | 'execution_order',
    constraint: 'uq_notebook_section_order' | 'uq_notebook_experiment_order' | 'uq_execution_order'
  ): Promise<boolean> {
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('NOTEBOOK_REORDER_DUPLICATES')
    }
    return runInTransaction(this.dataSource, async (_context, manager) => {
      await this.lockedParent(manager, parentTable, parentId, userId)
      const existing: Array<{ id: UUID }> = await manager.query(
        `SELECT id FROM public.${table}
         WHERE ${parentColumn}=$1::uuid AND user_id=$2::uuid FOR UPDATE`,
        [parentId, userId]
      )
      const set = new Set(existing.map(row => row.id))
      if (existing.length !== ids.length || ids.some(id => !set.has(id))) {
        throw new BadRequestException('NOTEBOOK_REORDER_INVALID_SIBLINGS')
      }
      await manager.query(`SET CONSTRAINTS ${constraint} DEFERRED`)
      for (const [index, id] of ids.entries()) {
        await manager.query(
          `UPDATE public.${table} SET ${orderColumn}=$1, updated_at=$2
           WHERE id=$3::uuid AND user_id=$4::uuid`,
          [index, Date.now(), id, userId]
        )
      }
      return true
    })
  }

  reorderSections(userId: UUID, notebookId: UUID, ids: UUID[]): Promise<boolean> {
    return this.reorder(userId, notebookId, ids,
      'lab_notebooks', 'lab_notebook_sections', 'notebook_id',
      'section_order', 'uq_notebook_section_order')
  }

  reorderExperiments(userId: UUID, sectionId: UUID, ids: UUID[]): Promise<boolean> {
    return this.reorder(userId, sectionId, ids,
      'lab_notebook_sections', 'lab_notebook_experiments', 'section_id',
      'experiment_order', 'uq_notebook_experiment_order')
  }

  reorderExecutions(userId: UUID, experimentId: UUID, ids: UUID[]): Promise<boolean> {
    return this.reorder(userId, experimentId, ids,
      'lab_notebook_experiments', 'lab_notebook_executions', 'experiment_id',
      'execution_order', 'uq_execution_order')
  }
}
