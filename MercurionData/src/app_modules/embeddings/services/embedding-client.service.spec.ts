import { Test, TestingModule } from '@nestjs/testing';
import { EmbeddingClientService } from './embedding-client.service';

describe('EmbeddingClientService', () => {
  let service: EmbeddingClientService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmbeddingClientService],
    }).compile();

    service = module.get<EmbeddingClientService>(EmbeddingClientService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
