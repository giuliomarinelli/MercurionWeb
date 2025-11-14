import { Test, TestingModule } from '@nestjs/testing';
import { DocumentController } from './document.controller';
import { DropboxObjectStoreService } from '../services/dropbox-object-store.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('DocumentController', () => {
  let controller: DocumentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [
        { provide: DropboxObjectStoreService, useValue: {} },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }) } },
      ],
    }).compile();

    controller = module.get<DocumentController>(DocumentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
