import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeCollectionItemJoinService } from './molecule-collection-item-join.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoleculeCollectionItemJoin } from '../models/entities/molecule-collection-item-join.entity';
import { DataSource } from 'typeorm';
import { MoleculeCollectionService } from './molecule-collection.service';
import { MoleculeCollectionItemService } from './molecule-collection-item.service';
import { MoleculeService } from 'src/app_modules/meilisearch/services/molecule.service';
import { LoggerPort } from 'src/logging/logger.port';
import { MoleculeOwnershipPolicy } from './molecule-ownership.policy';
import { UUID } from 'crypto';
import { BulkJoinLimitExceededError } from './bulk-join-planner';

describe('MoleculeCollectionItemJoinService', () => {
  let service: MoleculeCollectionItemJoinService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeCollectionItemJoinService,
        {
          provide: getRepositoryToken(MoleculeCollectionItemJoin),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            delete: jest.fn(),
            manager: { transaction: jest.fn() },
          },
        },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: MoleculeCollectionService, useValue: {} },
        { provide: MoleculeCollectionItemService, useValue: {} },
        { provide: MoleculeService, useValue: {} },
        {
          provide: MoleculeOwnershipPolicy,
          useValue: {
            classifyItems: jest.fn().mockResolvedValue({ ownedIds: [] }),
            classifyCollections: jest.fn().mockResolvedValue({ ownedIds: [] })
          }
        },
        { provide: LoggerPort, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<MoleculeCollectionItemJoinService>(MoleculeCollectionItemJoinService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('reuses the same bounded snapshot and exclusions across retries', async () => {
    const manager = {
      find: jest.fn().mockResolvedValue([
        { id: '00000000-0000-7000-8000-000000000002' },
        { id: '00000000-0000-7000-8000-000000000001' }
      ])
    };
    const plan = (service as unknown as {
      planItemCandidates(manager: unknown, userId: UUID, ids: UUID[], selectAll: boolean, snapshotAt?: string): Promise<{ candidateIds: UUID[] }>
    }).planItemCandidates.bind(service);
    const excluded = ['00000000-0000-7000-8000-000000000002' as UUID];

    const first = await plan(manager, '00000000-0000-7000-8000-000000000099' as UUID, excluded, true, '1700000000000');
    const retry = await plan(manager, '00000000-0000-7000-8000-000000000099' as UUID, excluded, true, '1700000000000');

    expect(first).toEqual(retry);
    expect(first.candidateIds).toEqual(['00000000-0000-7000-8000-000000000001']);
    expect(manager.find).toHaveBeenCalledTimes(2);
    expect(manager.find.mock.calls[0][1]).toMatchObject({
      order: { createdAt: 'ASC', id: 'ASC' },
      take: MoleculeCollectionItemJoinService.MAX_SYNCHRONOUS_BULK_CANDIDATES + 1
    });
  });

  it('rejects a missing snapshot and an over-limit snapshot before writes', async () => {
    const rows = Array.from(
      { length: MoleculeCollectionItemJoinService.MAX_SYNCHRONOUS_BULK_CANDIDATES + 1 },
      (_, index) => ({ id: String(index).padStart(36, '0') as UUID })
    );
    const manager = { find: jest.fn().mockResolvedValue(rows) };
    const plan = (service as unknown as {
      planItemCandidates(manager: unknown, userId: UUID, ids: UUID[], selectAll: boolean, snapshotAt?: string): Promise<unknown>
    }).planItemCandidates.bind(service);
    const userId = '00000000-0000-7000-8000-000000000099' as UUID;

    await expect(plan(manager, userId, [], true)).rejects.toThrow('BULK_SELECTION_SNAPSHOT_REQUIRED');
    await expect(plan(manager, userId, [], true, '1700000000000')).rejects.toBeInstanceOf(BulkJoinLimitExceededError);
  });
});
