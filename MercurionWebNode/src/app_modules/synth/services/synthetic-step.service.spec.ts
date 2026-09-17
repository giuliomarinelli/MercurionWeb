import { Test, TestingModule } from '@nestjs/testing';
import { SyntheticStepService } from './synthetic-step.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SynthStep } from '../models/entities/synth-step.entity';
import { Synthesis } from '../models/entities/synthesis.entity';
import { ApplicationErrorCode, getApplicationError } from 'src/exception-handling/application-error';
import { DataSource } from 'typeorm';
import { UnitOfWork } from 'src/persistence/transaction-context';

describe('SyntheticStepService', () => {
  let service: SyntheticStepService;
  let stepRepository: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    metadata: object;
  };
  let synthesisRepository: { findOne: jest.Mock };

  beforeEach(async () => {
    stepRepository = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      metadata: {},
    };
    synthesisRepository = { findOne: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SyntheticStepService,
        {
          provide: getRepositoryToken(SynthStep),
          useValue: stepRepository,
        },
        {
          provide: getRepositoryToken(Synthesis),
          useValue: synthesisRepository,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (work: (manager: unknown) => unknown) => work({
              getRepository: (target: unknown) => target === SynthStep ? stepRepository : synthesisRepository
            })),
          },
        },
        UnitOfWork,
      ],
    }).compile();

    service = module.get<SyntheticStepService>(SyntheticStepService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the updated step after an owner-scoped write', async () => {
    const step = { id: 'step-id' } as unknown as SynthStep;
    stepRepository.update.mockResolvedValue({ affected: 1 });
    stepRepository.findOne.mockResolvedValue(step);
    stepRepository.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(step),
    });

    await expect(service.update(
      'user-id' as never,
      'step-id' as never,
      { order: 1 } as never,
      {} as never,
    )).resolves.toBe(step);
    expect(stepRepository.update).toHaveBeenCalledWith(
      { id: 'step-id', userId: 'user-id' },
      { order: 1, description: null, reactionType: null }
    );
  });

  it('ignores identifiers, ownership and relation properties in an update command', async () => {
    const step = { id: 'step-id' } as unknown as SynthStep;
    stepRepository.findOne.mockResolvedValue(step);
    stepRepository.update.mockResolvedValue({ affected: 1 });
    stepRepository.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(step),
    });

    await service.update(
      'user-id' as never,
      'step-id' as never,
      {
        synthId: 'attacker-synthesis',
        order: 3,
        description: 'Safe description',
        reactionType: null,
        id: 'attacker-step',
        userId: 'attacker-user',
        synth: { id: 'attacker-synthesis' },
        items: [{ id: 'attacker-item' }],
      } as never,
      {} as never,
    );

    expect(stepRepository.update).toHaveBeenCalledWith(
      { id: 'step-id', userId: 'user-id' },
      { order: 3, description: 'Safe description', reactionType: null }
    );
  });

  it('classifies a zero-row update as owner access denial', async () => {
    stepRepository.update.mockResolvedValue({ affected: 0 });

    const error = await service.update(
      'user-id' as never,
      'step-id' as never,
      { order: 1 } as never,
      {} as never,
    ).catch((value) => value);

    expect(getApplicationError(error)?.code).toBe(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED);
  });

  it('returns the same explicit deleted outcome as route commands', async () => {
    stepRepository.findOne.mockResolvedValue({ id: 'step-id' });
    stepRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.delete('user-id' as never, 'step-id' as never))
      .resolves.toEqual({ success: true, outcome: 'DELETED' });
  });

  it('classifies a zero-row delete as owner access denial', async () => {
    stepRepository.findOne.mockResolvedValue(null);
    stepRepository.delete.mockResolvedValue({ affected: 0 });

    const error = await service.delete('user-id' as never, 'step-id' as never)
      .catch((value) => value);

    expect(getApplicationError(error)?.code).toBe(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED);
  });

  it('preserves an injected database failure as a typed persistence error', async () => {
    stepRepository.findOne.mockResolvedValue({ id: 'step-id' });
    const driverError = new Error('driver unavailable');
    stepRepository.delete.mockRejectedValue(driverError);

    const error = await service.delete('user-id' as never, 'step-id' as never)
      .catch((value) => value);

    expect(getApplicationError(error)?.code).toBe(ApplicationErrorCode.PERSISTENCE_FAILED);
    expect(error.cause).toBe(driverError);
  });
});
