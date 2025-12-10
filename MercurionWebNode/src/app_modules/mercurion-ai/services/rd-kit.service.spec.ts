import { Test, TestingModule } from '@nestjs/testing';
import { RDKitService } from './rd-kit.service';

describe('RdKitService', () => {
  let service: RDKitService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RDKitService],
    }).compile();

    service = module.get<RDKitService>(RDKitService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
