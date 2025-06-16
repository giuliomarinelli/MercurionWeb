import { Test, TestingModule } from '@nestjs/testing';
import { DropboxObjectStoreService } from './dropbox-object-store.service';

describe('DropboxObjectStoreService', () => {
  let service: DropboxObjectStoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DropboxObjectStoreService],
    }).compile();

    service = module.get<DropboxObjectStoreService>(DropboxObjectStoreService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
