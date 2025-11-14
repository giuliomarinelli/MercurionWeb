import { Test, TestingModule } from '@nestjs/testing';
import { MoleculeService } from './molecule.service';
import { MeiliLoggerService } from './meili-logger.service';

describe('MoleculeService', () => {
  let service: MoleculeService;

  beforeEach(async () => {
    const mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MoleculeService,
        { provide: 'MEILISEARCH_CLIENT', useValue: { index: jest.fn().mockReturnValue({}) } },
        { provide: MeiliLoggerService, useValue: { forContext: jest.fn().mockReturnValue(mockLogger) } },
      ],
    }).compile();

    service = module.get<MoleculeService>(MoleculeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
