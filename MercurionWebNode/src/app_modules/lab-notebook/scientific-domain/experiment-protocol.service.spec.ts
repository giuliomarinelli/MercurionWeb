import { UUID } from 'crypto'
import { DataSource, EntityManager } from 'typeorm'
import { ExperimentExecution } from './entities/experiment-execution.entity'
import { ExperimentProtocolRevision } from './entities/experiment-protocol-revision.entity'
import { NotebookDomainService } from './notebook-domain.service'
import { ExperimentProtocolService } from './experiment-protocol.service'

describe('ExperimentProtocolService - historical freeze', () => {
  const userId = '019a68d0-72fa-71a3-a1e8-a34fc1c23712' as UUID
  const experimentId = '019a68d0-72fb-72a3-98df-c9cdf14e17a4' as UUID
  const firstExecutionId = '019a68d0-72fc-78c6-ad3d-a2e2f32a875a' as UUID
  const secondExecutionId = '019a68d0-72fd-7f09-a620-f04bd7d4ca9b' as UUID
  const synthesisId = '019a68d0-72fe-71d7-9cbf-f3e50668202d' as UUID

  function setup(withSynthesis = false, foreignLink = false) {
    const experiment = {
      id: experimentId, userId, title: 'Prepare intermediate',
      contentDelta: { ops: [{ insert: 'Reflux for 60 minutes\n' }] },
      sanitizedText: 'Reflux for 60 minutes\n',
      archivedAt: null
    }
    const executions = new Map<string, Record<string, unknown>>([
      [firstExecutionId, {
        id: firstExecutionId, userId, experimentId, status: 'DRAFT',
        archivedAt: null, protocolRevisionId: null, startedAt: null
      }],
      [secondExecutionId, {
        id: secondExecutionId, userId, experimentId, status: 'DRAFT',
        archivedAt: null, protocolRevisionId: null, startedAt: null
      }]
    ])
    const revisions: Array<Record<string, unknown>> = []
    const manager = {
      query: jest.fn(async (sql: string) => {
        if (sql.includes('SELECT experiment_id AS "experimentId"')) {
          return [{ experimentId }]
        }
        if (sql.includes('notebook_experiment_synthesis_links')) {
          if (!withSynthesis) return []
          return [{
            synthesisId, linkOwner: foreignLink ? secondExecutionId : userId,
            synthesisOwner: userId, title: 'Route 1', notes: null
          }]
        }
        if (sql.includes('FROM public.synth_steps')) return []
        if (sql.includes('FROM public.synth_step_items')) return []
        return [{ id: firstExecutionId }]
      }),
      findOne: jest.fn(async (entity: unknown) => {
        if (entity === ExperimentProtocolRevision) return revisions[revisions.length - 1] ?? null
        return null
      }),
      create: jest.fn((_: unknown, payload: Record<string, unknown>) => payload),
      save: jest.fn(async (_: unknown, payload: Record<string, unknown>) => {
        revisions.push(payload)
        return payload
      }),
      update: jest.fn(async (entity: unknown, where: { id: UUID }, patch: Record<string, unknown>) => {
        if (entity === ExperimentExecution) {
          Object.assign(executions.get(where.id)!, patch)
        }
        return { affected: 1 }
      })
    }
    const datasource = {
      transaction: jest.fn(async (_level: string, work: (manager: unknown) => Promise<unknown>) => work(manager))
    }
    const notebooks = {
      ownedExperiment: jest.fn(async () => experiment),
      ownedExecution: jest.fn(async (_manager: unknown, _userId: UUID, id: UUID) => executions.get(id))
    }
    const service = new ExperimentProtocolService(
      datasource as unknown as DataSource,
      notebooks as unknown as NotebookDomainService
    )
    return { service, datasource, manager: manager as unknown as EntityManager,
      revisions, experiment, executions }
  }

  it('freezes one immutable revision when the first experiment execution starts', async () => {
    const { service, revisions, executions } = setup()
    const run = await service.start(userId, firstExecutionId)

    expect(run.status).toBe('IN_PROGRESS')
    expect(revisions).toHaveLength(1)
    expect(revisions[0].revisionNumber).toBe(1)
    expect(revisions[0].checksumSha256).toMatch(/^[a-f0-9]{64}$/)
    expect(revisions[0].snapshot).toEqual({
      schemaVersion: 1,
      experiment: {
        id: experimentId, title: 'Prepare intermediate',
        protocolDelta: { ops: [{ insert: 'Reflux for 60 minutes\n' }] },
        sanitizedText: 'Reflux for 60 minutes\n'
      },
      synthesis: []
    })
    expect(executions.get(firstExecutionId)?.protocolRevisionId).toBe(revisions[0].id)
  })

  it.each(['40001', '40P01'])('retries %s with a fresh Repeatable Read transaction', async code => {
    const { service, datasource, revisions } = setup()
    datasource.transaction.mockRejectedValueOnce(Object.assign(new Error('retry'), { code }))
    await expect(service.start(userId, firstExecutionId)).resolves.toMatchObject({ status: 'IN_PROGRESS' })
    expect(datasource.transaction).toHaveBeenCalledTimes(2)
    for (const call of datasource.transaction.mock.calls) expect(call[0]).toBe('REPEATABLE READ')
    expect(revisions).toHaveLength(1)
  })

  it('reuses the last revision when the planned protocol has not changed', async () => {
    const { service, revisions } = setup()
    await service.start(userId, firstExecutionId)
    await service.start(userId, secondExecutionId)
    expect(revisions).toHaveLength(1)
  })

  it('creates a new revision after the protocol changes', async () => {
    const { service, revisions, experiment } = setup()
    await service.start(userId, firstExecutionId)
    experiment.sanitizedText = 'Reflux for 90 minutes\n'
    await service.start(userId, secondExecutionId)
    expect(revisions.map(row => row.revisionNumber)).toEqual([1, 2])
  })

  it('captures linked synthesis metadata inside the immutable snapshot', async () => {
    const { service, revisions } = setup(true)
    await service.start(userId, firstExecutionId)
    expect((revisions[0].snapshot as {
      synthesis: Array<{ id: UUID; title: string }>
    }).synthesis[0]).toMatchObject({ id: synthesisId, title: 'Route 1' })
  })

  it('rejects cross-owner synthesis links before publishing a revision', async () => {
    const { service, revisions } = setup(true, true)
    await expect(service.start(userId, firstExecutionId))
      .rejects.toThrow('EXPERIMENT_SYNTHESIS_OWNER_CONFLICT')
    expect(revisions).toHaveLength(0)
  })

  it('does not let an already started execution start twice', async () => {
    const { service, revisions } = setup()
    await service.start(userId, firstExecutionId)
    await expect(service.start(userId, firstExecutionId))
      .rejects.toThrow('EXPERIMENT_EXECUTION_NOT_DRAFT')
    expect(revisions).toHaveLength(1)
  })
})
