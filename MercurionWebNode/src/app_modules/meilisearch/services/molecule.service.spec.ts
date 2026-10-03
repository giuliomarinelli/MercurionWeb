import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeService } from './molecule.service';
import { LoggerPort } from 'src/logging/logger.port';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CustomMoleculeItemEntity } from 'src/app_modules/molecule-collection/models/entities/custom-molecule-item.entity';
import { UUID } from 'crypto';
import { PcpService } from 'src/app_modules/mercurion-ai/services/pcp.service';

describe('MoleculeService', () => {
  let service: MoleculeService;
  const search = jest.fn();
  const findOne = jest.fn();
  const getIupacNameFromSmiles = jest.fn();

  beforeEach(async () => {
    search.mockReset();
    findOne.mockReset();
    getIupacNameFromSmiles.mockReset();
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeService,
        { provide: 'MEILISEARCH_CLIENT', useValue: { index: jest.fn().mockReturnValue({ search }) } },
        { provide: getRepositoryToken(CustomMoleculeItemEntity), useValue: { findOne } },
        { provide: LoggerPort, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
        { provide: PcpService, useValue: { getIupacNameFromSmiles } },
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

    await expect(service.getMoleculeName('C', '00000000-0000-0000-0000-000000000001' as UUID))
      .resolves.toEqual({ type: 'chembl', name: 'Nome ChEMBL' });
    expect(findOne).not.toHaveBeenCalled();
    expect(getIupacNameFromSmiles).not.toHaveBeenCalled();
  });

  it('looks up the current user custom molecule when ChEMBL has no name', async () => {
    const userId = '00000000-0000-0000-0000-000000000001' as UUID;
    search.mockResolvedValue({ hits: [] });
    findOne.mockResolvedValue({ name: 'Nome custom' });

    await expect(service.getMoleculeName('C', userId))
      .resolves.toEqual({ type: 'custom', name: 'Nome custom' });
    expect(findOne).toHaveBeenCalledWith({
      where: { userId, canonicalSmiles: 'C' },
      select: ['name']
    });
    expect(getIupacNameFromSmiles).not.toHaveBeenCalled();
  });

  it.each([undefined, '00000000-0000-0000-0000-000000000001' as UUID])(
    'falls back to PubChem when no ChEMBL or owned custom molecule is found (user %s)', async userId => {
      search.mockResolvedValue({ hits: [] });
      findOne.mockResolvedValue(null);
      getIupacNameFromSmiles.mockResolvedValue('ethanol');

      await expect(service.getMoleculeName('CCO', userId))
        .resolves.toEqual({ type: 'iupac', name: 'ethanol' });
      expect(getIupacNameFromSmiles).toHaveBeenCalledWith({ smiles: 'CCO' });
      expect(findOne).toHaveBeenCalledTimes(userId ? 1 : 0);
    }
  );
});
