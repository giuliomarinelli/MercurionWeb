import { APP_GUARD } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { Test } from '@nestjs/testing'
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify'
import { Environment } from 'src/config/config.schema'
import { DocumentController } from 'src/app_modules/dropbox-object-store/controllers/document.controller'
import { DocumentCommandService } from 'src/app_modules/dropbox-object-store/application/document-command.service'
import { FeatureAccessGuard } from './feature-access.guard'
import * as uploadTransport from 'src/app_modules/dropbox-object-store/transport/document-upload.adapter'

const endpoints = [
  ['GET', '/api/documents'],
  ['GET', '/api/documents/019a68d0-72fa-71a3-a1e8-a34fc1c23712'],
  ['DELETE', '/api/documents/019a68d0-72fa-71a3-a1e8-a34fc1c23712'],
  ['POST', '/api/documents/upload']
] as const

describe('Disabled DocumentController HTTP boundary', () => {
  let app: NestFastifyApplication
  const getOrThrow = jest.fn().mockReturnValue(Environment.Production)
  let parseUpload: jest.SpyInstance
  const commands = {
    upload: jest.fn(),
    replaceProfileImage: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
    list: jest.fn()
  }

  beforeAll(async () => {
    parseUpload = jest.spyOn(uploadTransport, 'parseDocumentUpload')
    const testModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [
        { provide: ConfigService, useValue: { getOrThrow } },
        { provide: DocumentCommandService, useValue: commands },
        { provide: APP_GUARD, useClass: FeatureAccessGuard }
      ]
    }).compile()
    app = testModule.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(), { logger: false }
    )
    app.setGlobalPrefix('api')
    await app.init()
    await app.getHttpAdapter().getInstance().ready()
  })

  afterAll(async () => {
    await app?.close()
    parseUpload.mockRestore()
  })
  beforeEach(() => jest.clearAllMocks())

  it.each(Object.values(Environment).flatMap(environment => endpoints.map(([method, url]) => ({
    environment, method, url
  }))))('returns HTTP 403 before running $method $url in $environment', async ({ environment, method, url }) => {
    getOrThrow.mockReturnValue(environment)
    const response = await app.inject({ method, url })
    expect(response.statusCode).toBe(403)
    expect(response.json().message).toBe('FEATURE_DISABLED')
    expect(parseUpload).not.toHaveBeenCalled()
    for (const serviceMethod of Object.values(commands)) {
      expect(serviceMethod).not.toHaveBeenCalled()
    }
  })
})
