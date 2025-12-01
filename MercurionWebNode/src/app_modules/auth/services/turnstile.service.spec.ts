import { Test, TestingModule } from '@nestjs/testing';
import { TurnstileService } from './turnstile.service';
import { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('TurnstileService', () => {
  let service: TurnstileService;

  let httpService: { post: jest.Mock };
  beforeEach(async () => {
    httpService = { post: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TurnstileService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: { get: () => 'secret' } },
        {
          provide: MeiliLoggerService,
          useValue: { forContext: jest.fn().mockReturnValue({ warn: jest.fn() }) },
        },
      ],
    }).compile();

    service = module.get<TurnstileService>(TurnstileService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('verifyToken', () => {
    it('returns true when success', async () => {
      httpService.post.mockReturnValue(of({ data: { success: true } }));
      await expect(service.verifyToken('abc')).resolves.toBe(true);
    });

    it('returns false on error', async () => {
      httpService.post.mockReturnValue(throwError(() => new Error('fail')));
      await expect(service.verifyToken('abc')).resolves.toBe(false);
    });
  });
});
