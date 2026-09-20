jest.mock('nestjs-typeorm-paginate', () => ({
  paginateRaw: jest.fn(),
}))

import { paginateRaw } from 'nestjs-typeorm-paginate'
import { HistoryService } from './history.service'
import { HistoryItemEntity } from '../models/enums/history-item-entity.enum'

const paginateRawMock = paginateRaw as jest.MockedFunction<typeof paginateRaw>

describe('HistoryService', () => {
  const userId = '00000000-0000-0000-0000-000000000001' as any

  function queryBuilder(rawRows: unknown[] = []) {
    return {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      distinctOn: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      setParameters: jest.fn().mockReturnThis(),
      getQuery: jest.fn().mockReturnValue('SELECT latest.id FROM history latest'),
      getParameters: jest.fn().mockReturnValue({ userId }),
      getRawMany: jest.fn().mockResolvedValue(rawRows),
    }
  }

  function createService() {
    const historyRepo = { delete: jest.fn() }
    const dataSource = {}
    const moleculeService = {
      getDetailsByMolregnosByKey: jest.fn(),
    }
    const loggerFactory = {
      forContext: jest.fn(() => ({ warn: jest.fn() })),
    }
    const service = new HistoryService(
      historyRepo as any,
      dataSource as any,
      moleculeService as any,
      loggerFactory as any,
    )

    return { service, historyRepo, moleculeService, loggerFactory }
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('projects a page, batches enrichment, and preserves missing resources', async () => {
    const latestQb = queryBuilder()
    const pageQb = queryBuilder()
    const collectionsQb = queryBuilder([
      { id: 'collection-1', name: 'Collection' },
    ])
    const itemsQb = queryBuilder([
      { id: 'item-custom', type: 'custom', name: 'Custom molecule', chemblMolregno: null },
      { id: 'item-chembl', type: 'chembl', name: null, chemblMolregno: '42' },
    ])
    const manager = {
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(latestQb)
        .mockReturnValueOnce(pageQb)
        .mockReturnValueOnce(collectionsQb)
        .mockReturnValueOnce(itemsQb),
    }
    const pageRows = [
      {
        id: 'history-1',
        itemEntity: HistoryItemEntity.MoleculeCollection,
        touchedAt: '1700000000000',
        itemId: 'collection-1',
        flagIds: '{}',
      },
      {
        id: 'history-2',
        itemEntity: HistoryItemEntity.MoleculeCollectionItem,
        touchedAt: '1700000001000',
        itemId: 'item-custom',
        flagIds: '{}',
      },
      {
        id: 'history-3',
        itemEntity: HistoryItemEntity.MoleculeCollectionItem,
        touchedAt: '1700000002000',
        itemId: 'item-chembl',
        flagIds: '{}',
      },
      {
        id: 'history-4',
        itemEntity: HistoryItemEntity.MoleculeCollection,
        touchedAt: '1700000003000',
        itemId: 'deleted-collection',
        flagIds: '{}',
      },
    ]
    paginateRawMock.mockResolvedValue({
      items: pageRows,
      meta: { itemCount: 4, limit: 25, currentPage: 1, totalItems: 4, totalPages: 1 },
    } as any)

    const { service, moleculeService } = createService()
    moleculeService.getDetailsByMolregnosByKey.mockResolvedValue(new Map([
      ['42', { preferredNameIt: 'Molecola', preferredName: 'Molecule' }],
    ]))

    const result = await service.getPaginatedHistoryWithManager(
      userId,
      { page: 1, limit: 25 },
      manager as any,
    )

    expect(result.items.map((item) => item.itemName)).toEqual([
      'Collection',
      'Custom molecule',
      'Molecola',
      'N/A',
    ])
    expect(result.meta.totalItems).toBe(4)
    expect(moleculeService.getDetailsByMolregnosByKey).toHaveBeenCalledTimes(1)
    expect(moleculeService.getDetailsByMolregnosByKey).toHaveBeenCalledWith(['42'])
    expect(pageQb.select).toHaveBeenCalledWith('h.id', 'id')
    expect(pageQb.addSelect).toHaveBeenCalledWith('h.flagIds', 'flagIds')
  })

  it('keeps provider calls page-bounded and deduplicates requested molregnos', async () => {
    const latestQb = queryBuilder()
    const pageQb = queryBuilder()
    const itemsQb = queryBuilder([
      { id: 'item-1', type: 'chembl', name: null, chemblMolregno: '42' },
      { id: 'item-2', type: 'chembl', name: null, chemblMolregno: '42' },
      { id: 'item-3', type: 'chembl', name: null, chemblMolregno: '43' },
    ])
    const manager = {
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(latestQb)
        .mockReturnValueOnce(pageQb)
        .mockReturnValueOnce(itemsQb),
    }
    paginateRawMock.mockResolvedValue({
      items: [
        {
          id: 'history-1',
          itemEntity: HistoryItemEntity.MoleculeCollectionItem,
          touchedAt: '1700000000000',
          itemId: 'item-1',
          flagIds: '{}',
        },
        {
          id: 'history-2',
          itemEntity: HistoryItemEntity.MoleculeCollectionItem,
          touchedAt: '1700000001000',
          itemId: 'item-2',
          flagIds: '{}',
        },
        {
          id: 'history-3',
          itemEntity: HistoryItemEntity.MoleculeCollectionItem,
          touchedAt: '1700000002000',
          itemId: 'item-3',
          flagIds: '{}',
        },
      ],
      meta: {},
    } as any)

    const { service, moleculeService } = createService()
    moleculeService.getDetailsByMolregnosByKey.mockResolvedValue(new Map())

    await service.getPaginatedHistoryWithManager(userId, { page: 1, limit: 25 }, manager as any)

    expect(moleculeService.getDetailsByMolregnosByKey).toHaveBeenCalledTimes(1)
    expect(moleculeService.getDetailsByMolregnosByKey).toHaveBeenCalledWith(['42', '43'])
  })

  it('uses owner-scoped latest-per-resource ordering with an immutable tie-breaker', async () => {
    const latestQb = queryBuilder()
    const pageQb = queryBuilder()
    const manager = {
      createQueryBuilder: jest.fn()
        .mockReturnValueOnce(latestQb)
        .mockReturnValueOnce(pageQb),
    }
    paginateRawMock.mockResolvedValue({ items: [], meta: {} } as any)

    const { service, moleculeService } = createService()
    moleculeService.getDetailsByMolregnosByKey.mockResolvedValue(new Map())

    await service.getPaginatedHistoryWithManager(userId, { page: 1, limit: 25 }, manager as any)

    expect(latestQb.where).toHaveBeenCalledWith('x.userId = :userId', { userId })
    expect(latestQb.addOrderBy).toHaveBeenCalledWith('x.touchedAt', 'DESC')
    expect(latestQb.addOrderBy).toHaveBeenCalledWith('x.id', 'DESC')
    expect(pageQb.orderBy).toHaveBeenCalledWith('h.touchedAt', 'DESC')
    expect(pageQb.addOrderBy).toHaveBeenCalledWith('h.id', 'DESC')
  })

  it('keeps recent history manager-aware and projected', async () => {
    const recentQb = queryBuilder([
      {
        id: 'history-2',
        itemEntity: HistoryItemEntity.MoleculeCollectionItem,
        itemId: 'item-1',
        touchedAt: '1700000001000',
      },
      {
        id: 'history-1',
        itemEntity: HistoryItemEntity.MoleculeCollectionItem,
        itemId: 'item-1',
        touchedAt: '1700000000000',
      },
    ])
    const manager = {
      getRepository: jest.fn().mockReturnValue({
        createQueryBuilder: jest.fn().mockReturnValue(recentQb),
      }),
    }

    const { service } = createService()
    const result = await service.getRecentHistoryTinyDistinctPerDayWithManager(
      userId,
      7,
      manager as any,
    )

    expect(manager.getRepository).toHaveBeenCalled()
    expect(recentQb.getRawMany).toHaveBeenCalledTimes(1)
    expect(result).toHaveLength(1)
    expect(result[0].itemId).toBe('item-1')
  })
})
