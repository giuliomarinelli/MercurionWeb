import { Test, TestingModule } from '@nestjs/testing';
import { SynthesisService } from './synthesis.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Synthesis } from '../models/entities/synthesis.entity';
import { ApplicationErrorCode, getApplicationError } from 'src/exception-handling/application-error';

describe('SyntheticRouteService', () => {
  let service: SynthesisService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SynthesisService,
        {
          provide: getRepositoryToken(Synthesis),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<SynthesisService>(SynthesisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the updated route after an owner-scoped write', async () => {
    const route = { id: 'route-id' } as unknown as Synthesis;
    repository.update.mockResolvedValue({ affected: 1 });
    jest.spyOn(service, 'findOne').mockResolvedValue(route);

    await expect(service.update(
      'route-id' as never,
      'user-id' as never,
      { title: 'Updated' } as never,
      {} as never,
    )).resolves.toBe(route);
  });

  it('classifies a zero-row update as owner access denial', async () => {
    repository.update.mockResolvedValue({ affected: 0 });

    const error = await service.update(
      'route-id' as never,
      'user-id' as never,
      { title: 'Updated' } as never,
      {} as never,
    ).catch((value) => value);

    expect(getApplicationError(error)?.code).toBe(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED);
  });

  it('returns an explicit deleted outcome', async () => {
    repository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.delete('route-id' as never, 'user-id' as never))
      .resolves.toEqual({ success: true, outcome: 'DELETED' });
  });

  it('classifies a zero-row delete as owner access denial', async () => {
    repository.delete.mockResolvedValue({ affected: 0 });

    const error = await service.delete('route-id' as never, 'user-id' as never)
      .catch((value) => value);

    expect(getApplicationError(error)?.code).toBe(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED);
  });

  it('does not convert a delete driver failure into false', async () => {
    const driverError = new Error('driver unavailable');
    repository.delete.mockRejectedValue(driverError);

    const error = await service.delete('route-id' as never, 'user-id' as never)
      .catch((value) => value);

    expect(getApplicationError(error)?.code).toBe(ApplicationErrorCode.PERSISTENCE_FAILED);
    expect(error.cause).toBe(driverError);
  });
});
