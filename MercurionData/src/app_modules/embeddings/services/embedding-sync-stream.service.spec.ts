import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingSyncStreamService } from './embedding-sync-stream.service';

describe('EmbeddingSyncStreamService', () => {
  let service: EmbeddingSyncStreamService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmbeddingSyncStreamService],
    }).compile();

    service = module.get<EmbeddingSyncStreamService>(EmbeddingSyncStreamService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
