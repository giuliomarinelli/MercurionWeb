import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectDataSource } from '@nestjs/typeorm'
import { UUID, createHash } from 'crypto'
import { uuidv7 } from '@kripod/uuidv7'
import { DataSource, EntityManager } from 'typeorm'
import { NotebookDomainService } from './notebook-domain.service'
import { ExperimentExecution } from './entities/experiment-execution.entity'
import { ExperimentProtocolRevision } from './entities/experiment-protocol-revision.entity'
import {
  ExperimentSynthesisLinkInput, ExecutionMoleculeLinkInput, ExecutionSynthesisLinkInput
} from './dto/notebook-domain.inputs'

interface LinkedSynthesisRow {
  synthesisId: UUID
  linkOwner: UUID
  synthesisOwner: UUID
  title: string
  notes: string | null
}

interface SnapshotStepRow {
  id: UUID
  userId: UUID
  synthId: UUID
  order: number
  description: string | null
  reactionType: string | null
}

interface SnapshotItemRow {
  id: UUID
  userId: UUID
  stepId: UUID
  poolMoleculeId: UUID | null
  poolOwner: UUID | null
  poolSynthesisId: UUID | null
  moleculeId: UUID | null
  moleculeOwner: UUID | null
  moleculeType: string | null
  canonicalSmiles: string | null
  kind: string
  position: string
  order: number
  text: string | null
}

interface SnapshotSynthesis {
  id: UUID
  title: string
  notes: string | null
  steps: Array<{
    id: UUID
    order: number
    description: string | null
    reactionType: string | null
    items: Array<{
      id: UUID
      poolMoleculeId: UUID | null
      moleculeId: UUID | null
      canonicalSmiles: string | null
      kind: string
      position: string
      order: number
      text: string | null
    }>
  }>
}

/**
 * Atomic protocol freeze and actual-run lifecycle.
 * Snapshot data has no FK dependency on mutable live chemical resources.
 */
@Injectable()
export class ExperimentProtocolService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly notebooks: NotebookDomainService
  ) {}

  private async snapshotSynthesis(
    manager: EntityManager, experimentId: UUID, userId: UUID
  ): Promise<SnapshotSynthesis[]> {
    const linked: LinkedSynthesisRow[] = await manager.query(
      `SELECT l.synthesis_id AS "synthesisId", l.user_id AS "linkOwner",
              s.user_id AS "synthesisOwner", s.title, s.notes
       FROM public.notebook_experiment_synthesis_links l
       JOIN public.synthesis s ON s.id=l.synthesis_id
       WHERE l.experiment_id=$1::uuid ORDER BY l.synthesis_id`,
      [experimentId]
    )
    if (linked.some(row => row.linkOwner !== userId || row.synthesisOwner !== userId)) {
      throw new ConflictException('EXPERIMENT_SYNTHESIS_OWNER_CONFLICT')
    }
    if (!linked.length) return []
    const synthIds = linked.map(row => row.synthesisId)

    const steps: SnapshotStepRow[] = await manager.query(
      `SELECT id,user_id AS "userId",synth_id AS "synthId",
              step_order AS "order",description,reaction_type AS "reactionType"
       FROM public.synth_steps
       WHERE synth_id=ANY($1::uuid[])
       ORDER BY synth_id,step_order,id`,
      [synthIds]
    )
    if (steps.some(step => step.userId !== userId)) {
      throw new ConflictException('EXPERIMENT_SYNTHESIS_STEP_OWNER_CONFLICT')
    }

    const items: SnapshotItemRow[] = await manager.query(
      `SELECT i.id,i.user_id AS "userId",i.step_id AS "stepId",
              i.pool_molecule_id AS "poolMoleculeId",
              p.user_id AS "poolOwner",p.synthesis_id AS "poolSynthesisId",
              p.molecule_id AS "moleculeId",m.user_id AS "moleculeOwner",
              m.type AS "moleculeType",m.canonical_smiles AS "canonicalSmiles",
              i.kind,i.position,i.item_order AS "order",i.text
       FROM public.synth_step_items i
       JOIN public.synth_steps st ON st.id=i.step_id
       LEFT JOIN public.synthesis_pool_molecules p ON p.id=i.pool_molecule_id
       LEFT JOIN public.molecule_collection_items m ON m.id=p.molecule_id
       WHERE st.synth_id=ANY($1::uuid[])
       ORDER BY st.synth_id,st.step_order,i.position,i.item_order,i.id`,
      [synthIds]
    )
    const stepToSynth = new Map(steps.map(step => [step.id, step.synthId]))
    for (const item of items) {
      if (item.userId !== userId || !stepToSynth.has(item.stepId)) {
        throw new ConflictException('EXPERIMENT_SYNTHESIS_ITEM_OWNER_CONFLICT')
      }
      if (item.poolMoleculeId != null &&
        (item.poolOwner !== userId || item.moleculeOwner !== userId ||
         item.moleculeType !== 'custom' ||
         item.poolSynthesisId !== stepToSynth.get(item.stepId) ||
         typeof item.canonicalSmiles !== 'string')) {
        throw new ConflictException('EXPERIMENT_SYNTHESIS_STRUCTURE_CONFLICT')
      }
    }

    const result: SnapshotSynthesis[] = []
    for (const synthesis of linked) {
      const synthSteps = steps.filter(step => step.synthId === synthesis.synthesisId)
        .map(step => ({
          id: step.id,
          order: step.order,
          description: step.description,
          reactionType: step.reactionType,
          items: items.filter(item => item.stepId === step.id).map(item => ({
            id: item.id,
            poolMoleculeId: item.poolMoleculeId,
            moleculeId: item.moleculeId,
            canonicalSmiles: item.canonicalSmiles,
            kind: item.kind,
            position: item.position,
            order: item.order,
            text: item.text
          }))
        }))
      result.push({
        id: synthesis.synthesisId,
        title: synthesis.title,
        notes: synthesis.notes,
        steps: synthSteps
      })
    }
    return result
  }

  private async withSerializationRetry<T>(
    work: (manager: EntityManager) => Promise<T>
  ): Promise<T> {
    // Repeatable Read gives a coherent chemistry snapshot during simultaneous
    // route edits; a serialization failure is retried from a fresh snapshot.
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.dataSource.transaction('REPEATABLE READ', work)
      } catch (error) {
        const dbError = error as { code?: string; driverError?: { code?: string } }
        const code = dbError.driverError?.code ?? dbError.code
        if (!['40001', '40P01'].includes(code ?? '') || attempt === 2) throw error
      }
    }
    throw new ConflictException('EXPERIMENT_SERIALIZATION_FAILED')
  }

  async start(userId: UUID, executionId: UUID): Promise<ExperimentExecution> {
    return this.withSerializationRetry(async manager => {
      // Lock ordering: experiment first, execution second. Both must belong to
      // the authenticated user; this serializes revision number allocation.
      const executions: Array<{ experimentId: UUID }> = await manager.query(
        `SELECT experiment_id AS "experimentId"
         FROM public.lab_notebook_executions WHERE id=$1::uuid AND user_id=$2::uuid`,
        [executionId, userId]
      )
      if (executions.length !== 1) throw new NotFoundException('EXPERIMENT_EXECUTION_NOT_FOUND')
      const experimentId = executions[0].experimentId
      await manager.query(
        `SELECT id FROM public.lab_notebook_experiments
         WHERE id=$1::uuid AND user_id=$2::uuid FOR UPDATE`,
        [experimentId, userId]
      )
      const experiment = await this.notebooks.ownedExperiment(manager, userId, experimentId)
      if (experiment.archivedAt != null) {
        throw new ConflictException('NOTEBOOK_EXPERIMENT_ARCHIVED')
      }

      await manager.query(
        `SELECT id FROM public.lab_notebook_executions
         WHERE id=$1::uuid AND user_id=$2::uuid FOR UPDATE`,
        [executionId, userId]
      )
      const execution = await this.notebooks.ownedExecution(manager, userId, executionId)
      if (execution.experimentId !== experimentId || execution.status !== 'DRAFT'
          || execution.archivedAt != null) {
        throw new ConflictException('EXPERIMENT_EXECUTION_NOT_DRAFT')
      }

      const synthesis = await this.snapshotSynthesis(manager, experimentId, userId)
      const snapshot: Record<string, unknown> = {
        schemaVersion: 1,
        experiment: {
          id: experiment.id,
          title: experiment.title,
          protocolDelta: experiment.contentDelta,
          sanitizedText: experiment.sanitizedText
        },
        synthesis
      }
      const checksum = createHash('sha256').update(JSON.stringify(snapshot)).digest('hex')
      const previous = await manager.findOne(ExperimentProtocolRevision, {
        where: { userId, experimentId },
        order: { revisionNumber: 'DESC' }
      })

      let revision = previous
      if (!revision || revision.checksumSha256.trim() !== checksum) {
        const now = Date.now()
        revision = manager.create(ExperimentProtocolRevision, {
          id: uuidv7() as UUID,
          userId, experimentId,
          revisionNumber: (previous?.revisionNumber ?? 0) + 1,
          snapshotSchemaVersion: 1,
          snapshot,
          checksumSha256: checksum,
          createdAt: now,
          createdBy: userId
        })
        revision = await manager.save(ExperimentProtocolRevision, revision)
      }

      await manager.update(ExperimentExecution, { id: execution.id, userId }, {
        status: 'IN_PROGRESS',
        protocolRevisionId: revision.id,
        startedAt: Date.now(),
        updatedAt: Date.now()
      })
      return this.notebooks.ownedExecution(manager, userId, executionId)
    })
  }

  async complete(userId: UUID, executionId: UUID): Promise<ExperimentExecution> {
    return this.changeRunStatus(userId, executionId, 'COMPLETED')
  }

  async cancel(userId: UUID, executionId: UUID): Promise<ExperimentExecution> {
    return this.changeRunStatus(userId, executionId, 'CANCELLED')
  }

  private async changeRunStatus(
    userId: UUID, executionId: UUID, status: 'COMPLETED' | 'CANCELLED'
  ): Promise<ExperimentExecution> {
    return this.dataSource.transaction(async manager => {
      await manager.query(
        `SELECT id FROM public.lab_notebook_executions
         WHERE id=$1::uuid AND user_id=$2::uuid FOR UPDATE`,
        [executionId, userId]
      )
      const execution = await this.notebooks.ownedExecution(manager, userId, executionId)
      if (execution.status !== 'IN_PROGRESS') {
        throw new ConflictException('EXPERIMENT_EXECUTION_NOT_IN_PROGRESS')
      }
      await manager.update(ExperimentExecution, { id: executionId, userId }, {
        status,
        completedAt: status === 'COMPLETED' ? Date.now() : null,
        updatedAt: Date.now()
      })
      return this.notebooks.ownedExecution(manager, userId, executionId)
    })
  }

  async linkSynthesisToExperiment(
    userId: UUID, input: ExperimentSynthesisLinkInput
  ): Promise<boolean> {
    return this.dataSource.transaction(async manager => {
      const experiment = await this.notebooks.ownedExperiment(manager, userId, input.experimentId as UUID)
      if (experiment.archivedAt != null) throw new ConflictException('NOTEBOOK_EXPERIMENT_ARCHIVED')
      const owned = await manager.query(
        'SELECT id FROM public.synthesis WHERE id=$1::uuid AND user_id=$2::uuid',
        [input.synthesisId, userId]
      )
      if (owned.length !== 1) throw new NotFoundException('SYNTHESIS_NOT_FOUND')
      await manager.query(
        `INSERT INTO public.notebook_experiment_synthesis_links
         (id,user_id,experiment_id,synthesis_id,created_at)
         VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5)
         ON CONFLICT (experiment_id,synthesis_id) DO NOTHING`,
        [uuidv7(), userId, input.experimentId, input.synthesisId, Date.now()]
      )
      return true
    })
  }

  async unlinkSynthesisFromExperiment(
    userId: UUID, input: ExperimentSynthesisLinkInput
  ): Promise<boolean> {
    return this.dataSource.transaction(async manager => {
      await this.notebooks.ownedExperiment(manager, userId, input.experimentId as UUID)
      await manager.query(
        `DELETE FROM public.notebook_experiment_synthesis_links
         WHERE user_id=$1::uuid AND experiment_id=$2::uuid AND synthesis_id=$3::uuid`,
        [userId, input.experimentId, input.synthesisId]
      )
      return true
    })
  }

  async linkSynthesisToExecution(
    userId: UUID, input: ExecutionSynthesisLinkInput
  ): Promise<boolean> {
    return this.dataSource.transaction(async manager => {
      const execution = await this.notebooks.ownedExecution(manager, userId, input.executionId as UUID)
      if (execution.status === 'COMPLETED' || execution.status === 'CANCELLED') {
        throw new ConflictException('EXPERIMENT_EXECUTION_FINALIZED')
      }
      const synthesis = await manager.query(
        'SELECT id FROM public.synthesis WHERE id=$1::uuid AND user_id=$2::uuid',
        [input.synthesisId, userId]
      )
      if (synthesis.length !== 1) throw new NotFoundException('SYNTHESIS_NOT_FOUND')
      if (input.stepId) {
        const step = await manager.query(
          `SELECT id FROM public.synth_steps
           WHERE id=$1::uuid AND synth_id=$2::uuid AND user_id=$3::uuid`,
          [input.stepId, input.synthesisId, userId]
        )
        if (step.length !== 1) throw new NotFoundException('SYNTHESIS_STEP_NOT_FOUND')
      }
      await manager.query(
        `INSERT INTO public.experiment_execution_synthesis_links
         (id,user_id,execution_id,synthesis_id,step_id,created_at)
         VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::uuid,$6)
         ON CONFLICT (execution_id,synthesis_id,step_id) DO NOTHING`,
        [uuidv7(), userId, input.executionId, input.synthesisId, input.stepId ?? null, Date.now()]
      )
      return true
    })
  }

  async linkMoleculeToExecution(
    userId: UUID, input: ExecutionMoleculeLinkInput
  ): Promise<boolean> {
    return this.dataSource.transaction(async manager => {
      const execution = await this.notebooks.ownedExecution(manager, userId, input.executionId as UUID)
      if (execution.status === 'COMPLETED' || execution.status === 'CANCELLED') {
        throw new ConflictException('EXPERIMENT_EXECUTION_FINALIZED')
      }
      const molecule = await manager.query(
        `SELECT id FROM public.molecule_collection_items
         WHERE id=$1::uuid AND user_id=$2::uuid`,
        [input.moleculeId, userId]
      )
      if (molecule.length !== 1) throw new NotFoundException('MOLECULE_NOT_FOUND')
      await manager.query(
        `INSERT INTO public.experiment_execution_molecule_links
         (id,user_id,execution_id,item_id,created_at)
         VALUES ($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5)
         ON CONFLICT (execution_id,item_id) DO NOTHING`,
        [uuidv7(), userId, input.executionId, input.moleculeId, Date.now()]
      )
      return true
    })
  }
}
