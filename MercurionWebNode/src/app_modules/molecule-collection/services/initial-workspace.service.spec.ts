import type { EntityManager } from 'typeorm'
import type { UUID } from 'crypto'

import { UnitOfWork } from 'src/persistence/transaction-context'
import { InitialWorkspaceService } from './initial-workspace.service'

describe('InitialWorkspaceService', () => {
  it('persists the initial molecules, collection and joins through one manager', async () => {
    const save = jest.fn(async (value) => value)
    const manager = {
      create: jest.fn((_entity, value) => value),
      save
    } as unknown as EntityManager
    const unitOfWork = new UnitOfWork({
      transaction: (work: (manager: EntityManager) => Promise<unknown>) => work(manager)
    } as never)
    const service = new InitialWorkspaceService()

    await unitOfWork.run((context) => service.createForUser(
      '00000000-0000-4000-8000-000000000001' as UUID,
      context
    ))

    expect(save).toHaveBeenCalledTimes(3)
    expect((save.mock.calls[0][0] as unknown[])).toHaveLength(5)
    expect((save.mock.calls[2][0] as unknown[])).toHaveLength(5)
  })
})
