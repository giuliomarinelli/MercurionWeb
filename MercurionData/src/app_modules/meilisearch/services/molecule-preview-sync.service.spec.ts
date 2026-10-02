import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'

import { MoleculePreviewView } from 'src/app_modules/chembl_36/Models/entities/molecule-preview-view'
import { MoleculePreviewSyncService } from './molecule-preview-sync.service'

describe('MoleculePreviewSyncService', () => {
  let service: MoleculePreviewSyncService
  let updateSettings: jest.Mock
  let getIndexes: jest.Mock
  let createIndex: jest.Mock
  let index: jest.Mock

  beforeEach(async () => {
    updateSettings = jest.fn().mockResolvedValue({ taskUid: 1 })
    getIndexes = jest.fn().mockResolvedValue({
      results: [{ uid: 'molecule_previews_chembl_36' }]
    })
    createIndex = jest.fn().mockResolvedValue({ taskUid: 2 })
    index = jest.fn().mockReturnValue({
      updateSettings,
      addDocuments: jest.fn()
    })

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculePreviewSyncService,
        {
          provide: getRepositoryToken(MoleculePreviewView),
          useValue: {
            count: jest.fn(),
            find: jest.fn()
          }
        },
        {
          provide: 'MEILISEARCH_CLIENT',
          useValue: {
            getIndexes,
            createIndex,
            index
          }
        }
      ]
    }).compile()

    service = module.get<MoleculePreviewSyncService>(MoleculePreviewSyncService)
  })

  it('reconciles preview index settings even when the index already exists', async () => {
    await service.onModuleInit()

    expect(createIndex).not.toHaveBeenCalled()
    expect(index).toHaveBeenCalledWith('molecule_previews_chembl_36')
    expect(updateSettings).toHaveBeenCalledWith(jasmine.objectContaining({
      searchableAttributes: jasmine.arrayContaining(['smiles']),
      filterableAttributes: jasmine.arrayContaining(['smiles'])
    }))
  })

  it('creates a missing preview index and applies the same canonical settings', async () => {
    getIndexes.mockResolvedValue({ results: [] })

    await service.onModuleInit()

    expect(createIndex).toHaveBeenCalledWith(
      'molecule_previews_chembl_36',
      { primaryKey: 'id' }
    )
    expect(updateSettings).toHaveBeenCalledWith(jasmine.objectContaining({
      filterableAttributes: jasmine.arrayContaining(['smiles'])
    }))
  })
})
