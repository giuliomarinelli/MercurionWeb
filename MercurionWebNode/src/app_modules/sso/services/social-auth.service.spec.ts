import { SocialAuthService } from './social-auth.service';
import { SocialProviderRegistry } from './social-provider-registry';
import { ScopeService } from 'src/app_modules/auth/services/scope.service';
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { DataSource } from 'typeorm';
import { SercurityService } from 'src/app_modules/auth/services/sercurity.service';

describe('SocialAuthService', () => {
  it('should be defined', () => {
    const service = new SocialAuthService(
      {} as SocialProviderRegistry,
      { manager: {} } as DataSource,
      { getEncryptedStandardScopes: jest.fn() } as unknown as ScopeService,
      {} as JwtToolsService,
      { get: jest.fn().mockReturnValue('secret') } as unknown as ConfigService,
      {
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
      } as unknown as RedisService,
      {
        encrypt_AES256: jest.fn(),
        decrypt_AES256: jest.fn(),
      } as unknown as SercurityService,
      {
        forContext: jest.fn().mockReturnValue({ warn: jest.fn(), log: jest.fn() }),
      } as unknown as MeiliLoggerService,
    );
    expect(service).toBeDefined();
  });
});
