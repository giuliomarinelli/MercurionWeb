import { Test, TestingModule } from '@nestjs/testing';
import { DropboxObjectStoreService } from './dropbox-object-store.service';
import { OAuth2ClientService } from 'src/app_modules/oauth2-client/services/oauth2-client.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DocumentEntity } from '../Models/entities/document.entity';

describe('DropboxObjectStoreService', () => {
  let service: DropboxObjectStoreService;

  beforeEach(async () => {
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
      ],
    }).compile();

    service = module.get<DropboxObjectStoreService>(DropboxObjectStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
