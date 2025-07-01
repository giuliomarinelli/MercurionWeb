import { Test, TestingModule } from '@nestjs/testing';
import { DocumentController } from './document.controller';
import { DropboxObjectStoreService } from '../services/dropbox-object-store.service';

describe('DocumentController', () => {
  let controller: DocumentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [{ provide: DropboxObjectStoreService, useValue: {} }],
    }).compile();

    controller = module.get<DocumentController>(DocumentController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
