import { RpcException } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { UUID } from 'crypto';
import { CustomMoleculeItemEntity } from '../../molecule-collection/Models/entities/custom-molecule-item.entity';
import { MoleculeCollection } from '../../molecule-collection/Models/entities/molecule-collection.entity';
import { SynthStepItem } from '../Models/entities/synth-step-item.entity';
import { SynthesisPoolCollection } from '../Models/entities/synthesis-pool-collection.entity';
import { SynthesisPoolMolecule } from '../Models/entities/synthesis-pool-molecule.entity';
import { SynthesisPoolService } from './synthesis-pool.service';

const SYNTHESIS_ID = '0198f2f0-1111-7abc-8abc-1234567890ab' as UUID
const COLLECTION_ID = '0198f2f0-2222-7abc-8abc-1234567890ab' as UUID
const MOLECULE_ID = '0198f2f0-3333-7abc-8abc-1234567890ab' as UUID
const POOL_ID = '0198f2f0-4444-7abc-8abc-1234567890ab' as UUID
const USER_ID = '0198f2f0-5555-7abc-8abc-1234567890ab' as UUID

describe('SynthesisPoolService', () => {
  let service: SynthesisPoolService
  const manager = {
    findOne: jest.fn(),
    find: jest.fn(),
    exists: jest.fn(),
    delete: jest.fn(),
    create: jest.fn((_entity: unknown, value: unknown) => value),
    save: jest.fn()
  }
  const dataSource = {
    transaction: jest.fn((callback: (value: typeof manager) => unknown) => callback(manager))
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SynthesisPoolService,
        { provide: getDataSourceToken(), useValue: dataSource }
      ]
    }).compile()
    service = module.get(SynthesisPoolService)
  })

  it('stores selected collections and a materialized custom-only molecule pool', async () => {
    const synthesis = { id: SYNTHESIS_ID, userId: USER_ID }
    const configured = { ...synthesis, poolCollections: [], poolMolecules: [] }
    manager.findOne
      .mockResolvedValueOnce(synthesis)
      .mockResolvedValueOnce(configured)
    manager.find
      .mockResolvedValueOnce([{ id: COLLECTION_ID, userId: USER_ID }])
      .mockResolvedValueOnce([{ id: MOLECULE_ID, userId: USER_ID, type: 'custom' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
    manager.save.mockResolvedValue([])

    await expect(service.configure(USER_ID, {
      synthesisId: SYNTHESIS_ID,
      collectionIds: [COLLECTION_ID],
      moleculeIds: [MOLECULE_ID]
    })).resolves.toBe(configured)

    expect(manager.find).toHaveBeenNthCalledWith(1, MoleculeCollection, expect.any(Object))
    const customFindCall = manager.find.mock.calls[1] as unknown as [
      typeof CustomMoleculeItemEntity,
      { where: { userId: UUID, type: string } }
    ]
    expect(customFindCall[0]).toBe(CustomMoleculeItemEntity)
    expect(customFindCall[1].where).toMatchObject({ userId: USER_ID, type: 'custom' })
    expect(manager.create).toHaveBeenCalledWith(SynthesisPoolCollection, expect.objectContaining({
      synthesisId: SYNTHESIS_ID,
      collectionId: COLLECTION_ID
    }))
    expect(manager.create).toHaveBeenCalledWith(SynthesisPoolMolecule, expect.objectContaining({
      synthesisId: SYNTHESIS_ID,
      moleculeId: MOLECULE_ID
    }))
  })

  it('does not remove a pool molecule already referenced by a step', async () => {
    manager.findOne.mockResolvedValue({ id: SYNTHESIS_ID, userId: USER_ID })
    manager.find
      .mockResolvedValueOnce([{ id: POOL_ID, moleculeId: MOLECULE_ID, userId: USER_ID }])
      .mockResolvedValueOnce([])
    manager.exists.mockResolvedValue(true)

    await expect(service.configure(USER_ID, {
      synthesisId: SYNTHESIS_ID,
      collectionIds: [],
      moleculeIds: []
    })).rejects.toBeInstanceOf(RpcException)

    const existsCall = manager.exists.mock.calls[0] as unknown as [
      typeof SynthStepItem,
      { where: { userId: UUID } }
    ]
    expect(existsCall[0]).toBe(SynthStepItem)
    expect(existsCall[1].where.userId).toBe(USER_ID)
    expect(manager.delete).not.toHaveBeenCalled()
  })

  it('rejects a collection outside the authenticated user ownership boundary', async () => {
    manager.findOne.mockResolvedValue({ id: SYNTHESIS_ID, userId: USER_ID })
    manager.find.mockResolvedValueOnce([])

    await expect(service.configure(USER_ID, {
      synthesisId: SYNTHESIS_ID,
      collectionIds: [COLLECTION_ID],
      moleculeIds: []
    })).rejects.toBeInstanceOf(RpcException)

    expect(manager.delete).not.toHaveBeenCalled()
  })

  it('rejects a non-custom or unowned molecule instead of admitting it to the pool', async () => {
    manager.findOne.mockResolvedValue({ id: SYNTHESIS_ID, userId: USER_ID })
    manager.find.mockResolvedValueOnce([])

    await expect(service.configure(USER_ID, {
      synthesisId: SYNTHESIS_ID,
      collectionIds: [],
      moleculeIds: [MOLECULE_ID]
    })).rejects.toBeInstanceOf(RpcException)

    expect(manager.delete).not.toHaveBeenCalled()
  })
})
