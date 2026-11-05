import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import request from 'supertest'
import type { Server } from 'node:http'
import { MoleculeNameI18nSeedController } from '../src/app_modules/translation/controllers/molecule-name-i18n-seed.controller'
import { MoleculeNameI18nSeedService } from '../src/app_modules/translation/molecule-name-i18n.service'

describe('Molecule name seed HTTP boundary (isolated e2e)', () => {
  let app: INestApplication<Server>
  const seedAll = jest.fn()

  beforeAll(async () => {
    const fixture = await Test.createTestingModule({
      controllers: [MoleculeNameI18nSeedController],
      providers: [{ provide: MoleculeNameI18nSeedService, useValue: { seedAll } }],
    }).compile()

    app = fixture.createNestApplication()
    app.useLogger(false)
    await app.init()
  })

  beforeEach(() => seedAll.mockReset())
  afterAll(async () => { await app?.close() })

  it('returns the seed result through the existing POST route', async () => {
    seedAll.mockResolvedValue({ totalSource: 2, upserted: 2 })
    const response = await request(app.getHttpServer())
      .post('/molecule-name-i18n/seed').expect(201)

    expect(seedAll).toHaveBeenCalledWith(1000)
    expect(response.body).toMatchObject({ ok: true, totalSource: 2, upserted: 2 })
    expect(response.body).toHaveProperty('elapsedMs', expect.any(Number))
  })

  it('does not report success when seeding fails', async () => {
    seedAll.mockRejectedValue(new Error('isolated repository failure'))
    const response = await request(app.getHttpServer())
      .post('/molecule-name-i18n/seed').expect(500)

    expect(response.body).not.toHaveProperty('ok', true)
    expect(JSON.stringify(response.body)).not.toContain('isolated repository failure')
  })
})
