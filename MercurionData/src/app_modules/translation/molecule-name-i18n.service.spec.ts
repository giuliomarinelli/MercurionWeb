import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm'
import { MoleculeIndexView } from 'src/app_modules/chembl_36/Models/entities/molecule-index-mv'
import { Test, TestingModule } from '@nestjs/testing'
import { MoleculeNameI18nSeedService } from './molecule-name-i18n.service'

describe('MoleculeNameI18nSeedService', () => {
  let service: MoleculeNameI18nSeedService
  const rows = jest.fn<Promise<{ molregno: number; preferred_en: string }[]>, []>()
  const query = jest.fn<Promise<unknown>, [string, (string | number)[]]>()

  beforeEach(async () => {
    rows.mockReset().mockResolvedValue([])
    query.mockReset().mockResolvedValue({})
    const builder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      distinct: jest.fn().mockReturnThis(),
      getRawMany: rows,
    }
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeNameI18nSeedService,
        { provide: getRepositoryToken(MoleculeIndexView), useValue: { createQueryBuilder: () => builder } },
        { provide: getDataSourceToken('MercurionConn'), useValue: { query } },
      ],
    }).compile()

    service = module.get<MoleculeNameI18nSeedService>(MoleculeNameI18nSeedService)
  })

  it('does not write when the source is empty', async () => {
    await expect(service.seedAll()).resolves.toEqual({ totalSource: 0, upserted: 0 })
    expect(query).not.toHaveBeenCalled()
  })

  it('keeps source names in SQL parameters and splits writes into batches', async () => {
    const quotedName = "name'; DROP TABLE ignored; --"
    rows.mockResolvedValue([
      { molregno: 1, preferred_en: quotedName },
      { molregno: 2, preferred_en: 'second' },
      { molregno: 3, preferred_en: 'third' },
    ])

    await expect(service.seedAll(2)).resolves.toEqual({ totalSource: 3, upserted: 3 })
    expect(query).toHaveBeenCalledTimes(2)
    expect(query.mock.calls[0][0]).toContain('($1, $2),($3, $4)')
    expect(query.mock.calls[0][0]).not.toContain(quotedName)
    expect(query.mock.calls[0][1]).toEqual([1, quotedName, 2, 'second'])
    expect(query.mock.calls[1][1]).toEqual([3, 'third'])
  })
})
