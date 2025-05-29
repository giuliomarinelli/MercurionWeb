import { Test, TestingModule } from '@nestjs/testing';
import { MeiliLoggerService } from './meili-logger.service';

describe('MeiliLoggerService', () => {
  let service: MeiliLoggerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeiliLoggerService,
        { provide: 'MEILISEARCH_CLIENT', useValue: {} },
      ],
    }).compile();

    service = module.get<MeiliLoggerService>(MeiliLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
