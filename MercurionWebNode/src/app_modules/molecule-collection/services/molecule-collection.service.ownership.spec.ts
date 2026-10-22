import { UUID } from 'crypto'
import { DataSource, Repository } from 'typeorm'
import { LoggerPort } from 'src/logging/logger.port'
import { History } from 'src/app_modules/history/models/entities/history.entity'
import { MoleculeCollection } from '../models/entities/molecule-collection.entity'
import { MoleculeCollectionService } from './molecule-collection.service'

describe('MoleculeCollectionService ownership and retention regressions', () => {
  const userId = '01969a4e-8c9e-7000-b8fa-bc1b69f59f7c' as UUID
  const foreignOwnerId = '0199ea1c-ea93-7000-8ddf-2e35079a11f2' as UUID
  const collectionId = '019a6614-bc1c-7001-aa09-f39a7b4381a4' as UUID
  const moleculeId = '019a2368-c2d5-7004-bebb-d019008fea08' as UUID

  function setup() {
    const manager = {
      findOneOrFail: jest.fn().mockResolvedValue({
        id: collectionId, userId, name: 'Test collection'
      }),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      insert: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
    }
    const source = {
      transaction: jest.fn(async (work: (manager: unknown) => Promise<unknown>) => work(manager))
    }
    const logger = {
      forContext: jest.fn().mockReturnValue({
        log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn()
      })
    }
    const service = new MoleculeCollectionService(
      {} as Repository<MoleculeCollection>,
      source as unknown as DataSource,
      logger as unknown as LoggerPort
    )
    return { service, manager }
  }

  it('does not delete molecule items when deleting a collection', async () => {
    const { service, manager } = setup()
    manager.delete.mockResolvedValue({ affected: 1 })

    await expect(service.delete(collectionId, userId)).resolves.toBe(true)

    expect(manager.delete).toHaveBeenCalledTimes(2)
    expect(manager.delete).toHaveBeenNthCalledWith(
      1, MoleculeCollection, { id: collectionId, userId }
    )
    expect(manager.delete.mock.calls[1]?.[0]).toBe(History)
    expect(manager.query).not.toHaveBeenCalled()
  })

  it('does not delete history if the collection did not exist', async () => {
    const { service, manager } = setup()
    manager.delete.mockResolvedValue({ affected: 0 })

    await expect(service.delete(collectionId, userId)).resolves.toBe(false)

    expect(manager.delete).toHaveBeenCalledTimes(1)
    expect(manager.query).not.toHaveBeenCalled()
  })

  it('refuses to duplicate a collection containing a foreign-owned item', async () => {
    const { service, manager } = setup()
    manager.find
      .mockResolvedValueOnce([{ itemId: moleculeId, userId }])
      .mockResolvedValueOnce([])

    await expect(service.duplicate(userId, collectionId)).resolves.toBeNull()

    expect(manager.create).not.toHaveBeenCalled()
    expect(manager.save).not.toHaveBeenCalled()
    expect(manager.insert).not.toHaveBeenCalled()
  })

  it('refuses to duplicate a collection containing a join owned by somebody else', async () => {
    const { service, manager } = setup()
    manager.find.mockResolvedValueOnce([
      { itemId: moleculeId, userId: foreignOwnerId }
    ])

    await expect(service.duplicate(userId, collectionId)).resolves.toBeNull()

    expect(manager.find).toHaveBeenCalledTimes(1)
    expect(manager.create).not.toHaveBeenCalled()
    expect(manager.insert).not.toHaveBeenCalled()
  })
})
