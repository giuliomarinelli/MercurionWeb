import { Test, TestingModule } from '@nestjs/testing';
import { SercurityService } from './sercurity.service';

describe('SercurityService', () => {
  let service: SercurityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SercurityService],
    }).compile();

    service = module.get<SercurityService>(SercurityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
