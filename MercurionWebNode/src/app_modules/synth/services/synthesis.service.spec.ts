import { Test, TestingModule } from '@nestjs/testing';
import { SynthesisService } from './synthesis.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Synthesis } from '../models/entities/synthesis.entity';
import { ApplicationErrorCode, getApplicationError } from 'src/exception-handling/application-error';
import { DataSource } from 'typeorm';
import { UnitOfWork } from 'src/persistence/transaction-context';

describe('SyntheticRouteService', () => {
  let service: SynthesisService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    metadata: object;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      metadata: {},
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SynthesisService,
        {
          provide: getRepositoryToken(Synthesis),
          useValue: repository,
        },
        {
          provide: DataSource,
          useValue: {
            transaction: jest.fn(async (work: (manager: unknown) => unknown) => work({
              getRepository: () => repository
            })),
          },
        },
        UnitOfWork,
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
    repository.findOne.mockResolvedValue(route);
    repository.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(route),
    });

    await expect(service.update(
      'route-id' as never,
      'user-id' as never,
      { title: 'Updated' } as never,
      {} as never,
    )).resolves.toBe(route);
    expect(repository.update).toHaveBeenCalledWith(
      { id: 'route-id', userId: 'user-id' },
      { title: 'Updated', notes: null }
    );
  });

  it('ignores protected and relation properties supplied outside the command', async () => {
    const route = { id: 'route-id' } as unknown as Synthesis;
    repository.findOne.mockResolvedValue(route);
    repository.update.mockResolvedValue({ affected: 1 });
    repository.createQueryBuilder.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(route),
    });

    await service.update(
      'route-id' as never,
      'user-id' as never,
      {
        title: 'Safe title',
        notes: 'Safe notes',
        id: 'attacker-id',
        userId: 'attacker-user',
        steps: [{ id: 'attacker-step' }],
        createdAt: new Date(),
      } as never,
      {} as never,
    );

    expect(repository.update).toHaveBeenCalledWith(
      { id: 'route-id', userId: 'user-id' },
      { title: 'Safe title', notes: 'Safe notes' }
    );
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
    repository.findOne.mockResolvedValue({ id: 'route-id' });
    repository.delete.mockResolvedValue({ affected: 1 });

    await expect(service.delete('route-id' as never, 'user-id' as never))
      .resolves.toEqual({ success: true, outcome: 'DELETED' });
  });

  it('classifies a zero-row delete as owner access denial', async () => {
    repository.findOne.mockResolvedValue(null);
    repository.delete.mockResolvedValue({ affected: 0 });

    const error = await service.delete('route-id' as never, 'user-id' as never)
      .catch((value) => value);

    expect(getApplicationError(error)?.code).toBe(ApplicationErrorCode.SYNTHESIS_ACCESS_DENIED);
  });

  it('does not convert a delete driver failure into false', async () => {
    repository.findOne.mockResolvedValue({ id: 'route-id' });
    const driverError = new Error('driver unavailable');
    repository.delete.mockRejectedValue(driverError);

    const error = await service.delete('route-id' as never, 'user-id' as never)
      .catch((value) => value);

    expect(getApplicationError(error)?.code).toBe(ApplicationErrorCode.PERSISTENCE_FAILED);
    expect(error.cause).toBe(driverError);
  });
});
