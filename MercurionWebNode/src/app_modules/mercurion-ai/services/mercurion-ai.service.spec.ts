import { MercurionAIService } from './mercurion-ai.service';
import { ConfigService } from '@nestjs/config';
import { LoggerPort } from 'src/logging/logger.port';
import { ScientificRpcPolicy } from './scientific-rpc.policy';

describe('MercurionService', () => {
  it('should be defined', () => {
    const config = {
      get: jest.fn().mockReturnValue('development'),
      getOrThrow: jest.fn().mockReturnValue('development'),
    } as unknown as ConfigService;
    const loggerFactory = {
      forContext: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn() }),
    } as unknown as LoggerPort;
    const service = new MercurionAIService(
      { send: jest.fn() } as any,
      config,
      loggerFactory,
      {} as ScientificRpcPolicy,
    );
    expect(service).toBeDefined();
  });
});
