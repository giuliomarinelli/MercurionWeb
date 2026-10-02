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

  it('resolves the molregno for a canonical SMILES from the preview index', async () => {
    search.mockResolvedValue({ hits: [{ id: 123 }] });

    await expect(service.getMolregnoByCanonicalSmiles('CCO')).resolves.toBe(123);
    expect(search).toHaveBeenCalledWith('', {
      filter: 'smiles = "CCO"',
      attributesToRetrieve: ['id'],
      limit: 1,
    });
  });

  it('returns null when the canonical SMILES is outside the indexed corpus', async () => {
    search.mockResolvedValue({ hits: [] });

    await expect(service.getMolregnoByCanonicalSmiles('N#N')).resolves.toBeNull();
  });

  it('prefers the ChEMBL name without querying custom molecules', async () => {
    search.mockResolvedValue({ hits: [{ preferredNameIt: 'Nome ChEMBL' }] });

    await expect(service.getPreferredNameItByCanonicalSmilesFromChembleCoalesceCustomMolecule('C', '00000000-0000-0000-0000-000000000001' as UUID))
      .resolves.toEqual({ type: 'chembl', preferredNameIt: 'Nome ChEMBL' });
    expect(findOne).not.toHaveBeenCalled();
  });

  it('looks up the current user custom molecule when ChEMBL has no name', async () => {
    const userId = '00000000-0000-0000-0000-000000000001' as UUID;
    search.mockResolvedValue({ hits: [] });
    findOne.mockResolvedValue({ name: 'Nome custom' });

    await expect(service.getPreferredNameItByCanonicalSmilesFromChembleCoalesceCustomMolecule('C', userId))
      .resolves.toEqual({ type: 'custom', preferredNameIt: 'Nome custom' });
    expect(findOne).toHaveBeenCalledWith({
      where: { userId, canonicalSmiles: 'C' },
      select: ['name']
    });
  });
});
