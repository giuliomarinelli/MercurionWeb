import { Test, TestingModule } from '@nestjs/testing';
import { SecurityAuditService } from './security-audit.service';
import { NotificationOutboxService } from 'src/app_modules/notification/services/outbox/notification-outbox.service';
import { DataSource } from 'typeorm';

describe('SecurityAuditService', () => {
  let service: SecurityAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SecurityAuditService,
        { provide: NotificationOutboxService, useValue: {} },
        { provide: DataSource, useValue: {} },
      ],
    }).compile();

    service = module.get<SecurityAuditService>(SecurityAuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
