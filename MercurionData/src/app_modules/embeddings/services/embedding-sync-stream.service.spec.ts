import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm'
import { MoleculeIndexView } from 'src/app_modules/chembl_36/Models/entities/molecule-index-mv'
import { MoleculeEmbedding } from '../Models/entities/molecule-embedding.entity'
import { EmbeddingClientService } from './embedding-client.service'
import { Test, TestingModule } from '@nestjs/testing'
import { EmbeddingSyncStreamService } from './embedding-sync-stream.service'

describe('EmbeddingSyncStreamService', () => {
  let service: EmbeddingSyncStreamService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingSyncStreamService,
        { provide: getRepositoryToken(MoleculeIndexView), useValue: {} },
        { provide: getRepositoryToken(MoleculeEmbedding, 'MercurionConn'), useValue: {} },
        { provide: getDataSourceToken('MercurionConn'), useValue: {} },
        { provide: EmbeddingClientService, useValue: {} },
      ],
    }).compile()

    service = module.get<EmbeddingSyncStreamService>(EmbeddingSyncStreamService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })
})
