import { MoleculeService } from '../../meilisearch/services/molecule.service';
import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeCollectionItemService } from './molecule-collection-item.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MoleculeCollectionItemEntity } from '../Models/entities/molecule-collection-item.entity';
import { DataSource } from 'typeorm';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';

const MOCK_ITEM_ID = '01900000-0000-7000-8000-000000000000';
const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001';

jest.mock('@kripod/uuidv7', () => ({ uuidv7: jest.fn(() => '01900000-0000-7000-8000-000000000000') }));

describe('MoleculeCollectionItemService', () => {
  let service: MoleculeCollectionItemService;
  const repoMock = {
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const moleculeServiceMock = {
    getDetailsByMolregnos: jest.fn(),
    getDetailByMolregno: jest.fn(),
  };
  const managerMock = {
    exists: jest.fn(),
    update: jest.fn(),
    insert: jest.fn(),
  };
  const dataSourceMock = {
    manager: {
      transaction: jest.fn().mockImplementation(async (cb: any) => cb(managerMock)),
    },
  };
  const loggerMock = {
    warn: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeCollectionItemService,
        {
          provide: getRepositoryToken(MoleculeCollectionItemEntity),
          useValue: repoMock,
        },
        {
          provide: MoleculeService,
          useValue: moleculeServiceMock,
        },
        { provide: DataSource, useValue: dataSourceMock },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(loggerMock) } },
      ],
    }).compile();

    service = module.get<MoleculeCollectionItemService>(MoleculeCollectionItemService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates and persists a new item', async () => {
    const input = { type: 'custom', name: 'Test' };
    const userId = MOCK_USER_ID;
    const createdEntity = { ...input, userId, id: MOCK_ITEM_ID };
    repoMock.create.mockReturnValue(createdEntity);
    repoMock.save.mockResolvedValue(createdEntity);
    const markSpy = jest.spyOn(service, 'markAsTouched').mockResolvedValue(true);

    const result = await service.create(userId, input);

    expect(repoMock.create).toHaveBeenCalledWith({ id: MOCK_ITEM_ID, ...input, userId });
    expect(repoMock.save).toHaveBeenCalledWith(createdEntity);
    expect(markSpy).toHaveBeenCalledWith(userId, createdEntity.id);
    expect(result).toEqual(createdEntity);
  });

  it('marks an item as touched inside a transaction', async () => {
    jest.spyOn(GeneralUtils, 'isValidUUIDv7').mockReturnValue(true);
    managerMock.exists.mockResolvedValue(true);

    const result = await service.markAsTouched(MOCK_USER_ID, MOCK_ITEM_ID);

    expect(dataSourceMock.manager.transaction).toHaveBeenCalled();
    expect(managerMock.update).toHaveBeenCalledTimes(1);
    expect(managerMock.update.mock.calls[0]?.[0]).toBe(MoleculeCollectionItemEntity);
    expect(managerMock.update.mock.calls[0]?.[1]).toEqual({ userId: MOCK_USER_ID, id: MOCK_ITEM_ID });
    expect(managerMock.update.mock.calls[0]?.[2]?.touchedAt).toEqual(expect.any(Number));
    expect(result).toBe(true);
  });

  it('returns enriched polymorphic DTOs for the all-items GraphQL query', async () => {
    const queryBuilderMock = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([
        {
          id: MOCK_ITEM_ID,
          type: 'chembl',
          chemblMolregno: 42,
          label: 'Lead',
          notes: null,
          createdAt: 1,
          updatedAt: 2,
          touchedAt: 3,
          joins: [],
        },
        {
          id: '01900000-0000-7000-8000-000000000001',
          type: 'custom',
          canonicalSmiles: 'CCO',
          name: 'Ethanol',
          label: null,
          notes: null,
          createdAt: 4,
          updatedAt: 5,
          touchedAt: 6,
          joins: [],
        },
      ]),
    };
    const chemblDetails = {
      id: 42,
      cmbId: 'CHEMBL42',
      preferredName: 'Example',
    };
    repoMock.createQueryBuilder.mockReturnValue(queryBuilderMock);
    moleculeServiceMock.getDetailsByMolregnos.mockResolvedValue([chemblDetails]);

    const result = await service.findAllByUser(MOCK_USER_ID, {
      id: {},
      type: {},
      label: {},
      chemblDetails: { id: {}, preferredName: {} },
      canonicalSmiles: {},
      name: {},
      joins: { id: {}, collection: { id: {} } },
    });

    expect(queryBuilderMock.select).toHaveBeenCalledWith(expect.arrayContaining([
      'item.id',
      'item.type',
      'item.chemblMolregno',
    ]));
    expect(queryBuilderMock.leftJoinAndSelect).toHaveBeenCalledWith('item.joins', 'joins');
    expect(moleculeServiceMock.getDetailsByMolregnos).toHaveBeenCalledWith(['42']);
    expect(result).toEqual([
      expect.objectContaining({
        id: MOCK_ITEM_ID,
        type: 'chembl',
        chemblMolregno: '42',
        chemblDetails,
      }),
      expect.objectContaining({
        type: 'custom',
        canonicalSmiles: 'CCO',
        name: 'Ethanol',
      }),
    ]);
  });
});
