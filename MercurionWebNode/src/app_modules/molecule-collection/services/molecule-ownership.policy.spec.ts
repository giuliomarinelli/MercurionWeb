import { MoleculeOwnershipPolicy } from './molecule-ownership.policy'
import { MoleculeCollection } from '../models/entities/molecule-collection.entity'
import { MoleculeCollectionItemEntity } from '../models/entities/molecule-collection-item.entity'

describe('MoleculeOwnershipPolicy', () => {
  const userId = '00000000-0000-0000-0000-000000000001' as any
  const ownedId = '01900000-0000-7000-8000-000000000001' as any
  const foreignId = '01900000-0000-7000-8000-000000000002' as any
  const missingId = '01900000-0000-7000-8000-000000000003' as any

  it('classifies owner, foreign and missing ids in one set-based read', async () => {
    const manager = {
      find: jest.fn().mockResolvedValue([
        { id: ownedId, userId },
        { id: foreignId, userId: '00000000-0000-0000-0000-000000000002' },
      ]),
    } as any
    const policy = new MoleculeOwnershipPolicy()

    await expect(policy.classifyItems(manager, userId, [ownedId, foreignId, missingId]))
      .resolves.toEqual({
        requestedIds: [ownedId, foreignId, missingId],
        ownedIds: [ownedId],
        missingIds: [missingId],
        foreignIds: [foreignId],
      })
    expect(manager.find).toHaveBeenCalledTimes(1)
    expect(manager.find).toHaveBeenCalledWith(MoleculeCollectionItemEntity, expect.objectContaining({
      where: expect.objectContaining({ id: expect.anything() }),
    }))
  })

  it('uses the supplied transaction manager for collection assertions', async () => {
    const manager = {
      find: jest.fn().mockResolvedValue([{ id: ownedId, userId }]),
    } as any
    const policy = new MoleculeOwnershipPolicy()
    await expect(policy.assertCollectionOwned(manager, userId, ownedId)).resolves.toBeUndefined()
    expect(manager.find).toHaveBeenCalledWith(MoleculeCollection, expect.anything())
  })

  it('rejects a mixed batch instead of allowing a partial mutation', async () => {
    const manager = {
      find: jest.fn().mockResolvedValue([{ id: ownedId, userId }]),
    } as any
    const policy = new MoleculeOwnershipPolicy()
    await expect(policy.assertAllItemsOwned(manager, userId, [ownedId, missingId]))
      .rejects.toThrow('MoleculeAccessForbidden')
  })
})
