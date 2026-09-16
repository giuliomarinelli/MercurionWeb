import { Test, TestingModule } from '@nestjs/testing';
import { SyntheticStepService } from './synthetic-step.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SynthStep } from '../models/entities/synth-step.entity';
import { Synthesis } from '../models/entities/synthesis.entity';
import { ApplicationErrorCode, getApplicationError } from 'src/exception-handling/application-error';

describe('SyntheticStepService', () => {
  let service: SyntheticStepService;
  let stepRepository: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
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
    jest.spyOn(service, 'findOneById').mockResolvedValue(step);

    await expect(service.update(
      'user-id' as never,
      'step-id' as never,
      { order: 1 } as never,
      {} as never,
    )).resolves.toBe(step);
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
    stepRepository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.delete('user-id' as never, 'step-id' as never))
      .resolves.toEqual({ success: true, outcome: 'DELETED' });
  });

  it('classifies a zero-row delete as owner access denial', async () => {
    stepRepository.delete.mockResolvedValue({ affected: 0 });

    const error = await service.delete('user-id' as never, 'step-id' as never)
      .catch((value) => value);

    expect(getApplicationError(error)?.code).toBe(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED);
  });

  it('preserves an injected database failure as a typed persistence error', async () => {
    const driverError = new Error('driver unavailable');
    stepRepository.delete.mockRejectedValue(driverError);

    const error = await service.delete('user-id' as never, 'step-id' as never)
      .catch((value) => value);

    expect(getApplicationError(error)?.code).toBe(ApplicationErrorCode.PERSISTENCE_FAILED);
    expect(error.cause).toBe(driverError);
  });
});
