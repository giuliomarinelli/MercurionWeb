import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { MeiliLoggerService } from './meili-logger.service';

describe('MeiliLoggerService', () => {
  let service: MeiliLoggerService;
  let addDocuments: jest.Mock;

  beforeEach(async () => {
    addDocuments = jest.fn().mockResolvedValue(undefined);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeiliLoggerService,
        {
          provide: 'MEILISEARCH_CLIENT',
          useValue: { index: jest.fn().mockReturnValue({ addDocuments }) },
        },
        { provide: ConfigService, useValue: { getOrThrow: jest.fn(() => 'test') } },
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

    const entry = addDocuments.mock.calls[0][0][0];
    expect(entry.message).not.toContain('secret-password');
    expect(entry.message).not.toContain('secret-token');
    expect(entry.message).not.toContain('user@example.test');
    expect(entry.message).toContain('***redacted***');
  });

  it('contains sink failures without recursively invoking the adapter', async () => {
    addDocuments.mockRejectedValueOnce(new Error('sink unavailable'));
    const baseError = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    expect(() => service.warn('application warning')).not.toThrow();
    await new Promise((resolve) => setImmediate(resolve));

    expect(baseError).toHaveBeenCalledWith(
      '[LOGGER] Failed to send log to Meili:',
      'sink unavailable',
    );
    baseError.mockRestore();
  });
});
