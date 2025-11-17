import { Test, TestingModule } from '@nestjs/testing';
import { SecurityAuditService } from './security-audit.service';

describe('SecurityAuditService', () => {
  let service: SecurityAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityAuditService,
        { provide: 'MEILISEARCH_CLIENT', useValue: { getIndex: jest.fn(), createIndex: jest.fn(), index: jest.fn().mockReturnValue({ addDocuments: jest.fn() }) } },
      ],
    }).compile();

    service = module.get<SecurityAuditService>(SecurityAuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
