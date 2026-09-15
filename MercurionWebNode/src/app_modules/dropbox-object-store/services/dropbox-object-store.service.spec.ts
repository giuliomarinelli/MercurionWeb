import { Test, TestingModule } from '@nestjs/testing';
import { DropboxObjectStoreService } from './dropbox-object-store.service';
import { OAuth2ClientService } from 'src/app_modules/oauth2-client/services/oauth2-client.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentEntity } from '../models/entities/document.entity';
import { DataSource } from 'typeorm';
import { LoggerPort } from 'src/logging/logger.port';

describe('DropboxObjectStoreService', () => {
  let service: DropboxObjectStoreService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DropboxObjectStoreService,
        { provide: OAuth2ClientService, useValue: { getAccessToken: jest.fn() } },
        {
          provide: getRepositoryToken(DocumentEntity),
          useValue: {
            findOne: jest.fn(),
            findOneBy: jest.fn(),
            find: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: DataSource, useValue: { transaction: jest.fn() } },
        { provide: LoggerPort, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<DropboxObjectStoreService>(DropboxObjectStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
