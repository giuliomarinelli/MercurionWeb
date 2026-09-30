import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeService } from './molecule.service';
import { LoggerPort } from 'src/logging/logger.port';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomMoleculeItemEntity } from 'src/app_modules/molecule-collection/models/entities/custom-molecule-item.entity';
import { UUID } from 'crypto';

describe('MoleculeService', () => {
  let service: MoleculeService;
  const search = jest.fn();
  const findOne = jest.fn();

  beforeEach(async () => {
    search.mockReset();
    findOne.mockReset();
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeService,
        { provide: 'MEILISEARCH_CLIENT', useValue: { index: jest.fn().mockReturnValue({ search }) } },
        { provide: getRepositoryToken(CustomMoleculeItemEntity), useValue: { findOne } },
        { provide: LoggerPort, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<MoleculeService>(MoleculeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('prefers the ChEMBL name without querying custom molecules', async () => {
    search.mockResolvedValue({ hits: [{ preferredNameIt: 'Nome ChEMBL' }] });

    await expect(service.getPreferredNameItByCanonicalSmilesFromChembleCoalesceCustomMolecule('C', '00000000-0000-0000-0000-000000000001' as UUID))
      .resolves.toBe('Nome ChEMBL');
    expect(findOne).not.toHaveBeenCalled();
  });

  it('looks up the current user custom molecule when ChEMBL has no name', async () => {
    const userId = '00000000-0000-0000-0000-000000000001' as UUID;
    search.mockResolvedValue({ hits: [] });
    findOne.mockResolvedValue({ name: 'Nome custom' });

    await expect(service.getPreferredNameItByCanonicalSmilesFromChembleCoalesceCustomMolecule('C', userId))
      .resolves.toBe('Nome custom');
    expect(findOne).toHaveBeenCalledWith({
      where: { userId, canonicalSmiles: 'C' },
      select: ['name']
    });
  });
});
