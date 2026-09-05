import { RpcException } from '@nestjs/microservices';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UUID } from 'crypto';
import { SynthStepItem } from '../Models/entities/synth-step-item.entity';
import { SynthStep } from '../Models/entities/synth-step.entity';
import { SynthesisPoolMolecule } from '../Models/entities/synthesis-pool-molecule.entity';
import { SynthStepItemKind } from '../Models/enums/synth-step-item-kind.enum';
import { SynthStepItemPosition } from '../Models/enums/synth-step-item-position.enum';
import { SynthStepItemService } from './synth-step-item.service';

const STEP_ID = '0198f2f0-1111-7abc-8abc-1234567890ab' as UUID
const SECOND_STEP_ID = '0198f2f0-2222-7abc-8abc-1234567890ab' as UUID
const SYNTHESIS_ID = '0198f2f0-3333-7abc-8abc-1234567890ab' as UUID
const POOL_ID = '0198f2f0-4444-7abc-8abc-1234567890ab' as UUID
const USER_ID = '0198f2f0-5555-7abc-8abc-1234567890ab' as UUID

describe('SynthStepItemService', () => {
  let service: SynthStepItemService
  const itemRepo = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn((value: unknown) => value),
    save: jest.fn((value: unknown) => Promise.resolve(value)),
    update: jest.fn(),
    delete: jest.fn()
  }
  const stepRepo = { findOne: jest.fn() }
  const poolRepo = { findOne: jest.fn() }

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SynthStepItemService,
        { provide: getRepositoryToken(SynthStepItem), useValue: itemRepo },
        { provide: getRepositoryToken(SynthStep), useValue: stepRepo },
        { provide: getRepositoryToken(SynthesisPoolMolecule), useValue: poolRepo }
      ]
    }).compile()

    service = module.get(SynthStepItemService)
  })

  it('creates a reactant only from a pool molecule owned by the same synthesis', async () => {
    const step = { id: STEP_ID, synthId: SYNTHESIS_ID, userId: USER_ID }
    const poolMolecule = { id: POOL_ID, synthesisId: SYNTHESIS_ID, userId: USER_ID }
    stepRepo.findOne.mockResolvedValue(step)
    poolRepo.findOne.mockResolvedValue(poolMolecule)

    await service.create(USER_ID, {
      stepId: STEP_ID,
      poolMoleculeId: POOL_ID,
      kind: SynthStepItemKind.Reactant,
      position: SynthStepItemPosition.BeforeArrow,
      order: 0
    })

    expect(poolRepo.findOne).toHaveBeenCalledWith({
      where: { id: POOL_ID, synthesisId: SYNTHESIS_ID, userId: USER_ID }
    })
    expect(itemRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      stepId: STEP_ID,
      poolMoleculeId: POOL_ID,
      kind: SynthStepItemKind.Reactant,
      position: SynthStepItemPosition.BeforeArrow
    }))
  })

  it('allows one product pool molecule to be reused as a reactant in the next step', async () => {
    stepRepo.findOne
      .mockResolvedValueOnce({ id: STEP_ID, synthId: SYNTHESIS_ID, userId: USER_ID })
      .mockResolvedValueOnce({ id: SECOND_STEP_ID, synthId: SYNTHESIS_ID, userId: USER_ID })
    poolRepo.findOne.mockResolvedValue({ id: POOL_ID, synthesisId: SYNTHESIS_ID, userId: USER_ID })

    await service.create(USER_ID, {
      stepId: STEP_ID,
      poolMoleculeId: POOL_ID,
      kind: SynthStepItemKind.Product,
      position: SynthStepItemPosition.AfterArrow,
      order: 0
    })
    await service.create(USER_ID, {
      stepId: SECOND_STEP_ID,
      poolMoleculeId: POOL_ID,
      kind: SynthStepItemKind.Reactant,
      position: SynthStepItemPosition.BeforeArrow,
      order: 0
    })

    expect(itemRepo.save).toHaveBeenCalledTimes(2)
  })

  it('supports textual conditions on the arrow without a molecule', async () => {
    stepRepo.findOne.mockResolvedValue({ id: STEP_ID, synthId: SYNTHESIS_ID, userId: USER_ID })

    await service.create(USER_ID, {
      stepId: STEP_ID,
      text: 'reflux, -78 °C',
      kind: SynthStepItemKind.Condition,
      position: SynthStepItemPosition.OnArrow,
      order: 0
    })

    expect(poolRepo.findOne).not.toHaveBeenCalled()
    expect(itemRepo.create).toHaveBeenCalledWith(expect.objectContaining({
      text: 'reflux, -78 °C',
      poolMoleculeId: null
    }))
  })

  it('rejects a pool molecule that does not belong to the step synthesis', async () => {
    stepRepo.findOne.mockResolvedValue({ id: STEP_ID, synthId: SYNTHESIS_ID, userId: USER_ID })
    poolRepo.findOne.mockResolvedValue(null)

    await expect(service.create(USER_ID, {
      stepId: STEP_ID,
      poolMoleculeId: POOL_ID,
      kind: SynthStepItemKind.Reactant,
      position: SynthStepItemPosition.BeforeArrow,
      order: 0
    })).rejects.toBeInstanceOf(RpcException)
  })

  it('rejects a product placed anywhere except after the arrow', async () => {
    stepRepo.findOne.mockResolvedValue({ id: STEP_ID, synthId: SYNTHESIS_ID, userId: USER_ID })

    await expect(service.create(USER_ID, {
      stepId: STEP_ID,
      poolMoleculeId: POOL_ID,
      kind: SynthStepItemKind.Product,
      position: SynthStepItemPosition.OnArrow,
      order: 0
    })).rejects.toBeInstanceOf(RpcException)
    expect(poolRepo.findOne).not.toHaveBeenCalled()
  })
})
