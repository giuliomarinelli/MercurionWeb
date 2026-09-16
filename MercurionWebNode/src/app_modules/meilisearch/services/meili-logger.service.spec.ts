import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
import { MeiliLoggerService } from './meili-logger.service';
import { NotificationOutboxService } from 'src/app_modules/notification/services/outbox/notification-outbox.service';
import { DataSource } from 'typeorm';

describe('MeiliLoggerService', () => {
  let service: MeiliLoggerService;
  let append: jest.Mock;

  beforeEach(async () => {
    append = jest.fn().mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeiliLoggerService,
        { provide: NotificationOutboxService, useValue: { append } },
        {
          provide: DataSource,
          useValue: { transaction: jest.fn(async (work: (manager: object) => Promise<void>) => work({})) },
        },
      ],
    }).compile();

    service = module.get<MeiliLoggerService>(MeiliLoggerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('redacts sensitive structured values before sending them to the sink', () => {
    service.log({
      password: 'secret-password',
      accessToken: 'secret-token',
      user: { email: 'user@example.test' },
    });

    const entry = append.mock.calls[0][1].payload.document;
    expect(entry.message).not.toContain('secret-password');
    expect(entry.message).not.toContain('secret-token');
    expect(entry.message).not.toContain('user@example.test');
    expect(entry.message).toContain('***redacted***');
  });

  it('contains sink failures without recursively invoking the adapter', async () => {
    append.mockRejectedValueOnce(new Error('sink unavailable'));
    const baseError = jest.spyOn(Logger, 'error').mockImplementation(() => undefined);

    expect(() => service.warn('application warning')).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));

    expect(baseError).toHaveBeenCalledWith(
      '[LOGGER_OUTBOX_FAILED] sink unavailable',
    );
    baseError.mockRestore();
  });
});
