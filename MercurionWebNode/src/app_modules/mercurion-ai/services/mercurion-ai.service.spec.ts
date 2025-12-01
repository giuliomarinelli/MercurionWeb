import { MercurionAIService } from './mercurion-ai.service';
import { ConfigService } from '@nestjs/config';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

describe('MercurionService', () => {
  it('should be defined', () => {
    const config = {
      get: jest.fn().mockReturnValue('development'),
    } as unknown as ConfigService;
    const loggerFactory = {
      forContext: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn() }),
    } as unknown as MeiliLoggerService;
    const service = new MercurionAIService(
      { send: jest.fn() } as any,
      config,
      loggerFactory,
    );
    expect(service).toBeDefined();
  });
});
