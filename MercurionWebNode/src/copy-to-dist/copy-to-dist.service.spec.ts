import { Test, TestingModule } from '@nestjs/testing';
import { CopyToDistService } from './copy-to-dist.service';

describe('CopyToDistService', () => {
  let service: CopyToDistService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CopyToDistService],
    }).compile();

    service = module.get<CopyToDistService>(CopyToDistService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
