import { SocialAuthService } from './social-auth.service';
import { SocialProviderRegistry } from './social-provider-registry';
import { ScopeService } from 'src/app_modules/auth/services/scope.service';
import { JwtToolsService } from 'src/app_modules/auth/services/jwt-tools.service';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { LoggerPort } from 'src/logging/logger.port';
import { SecurityService } from 'src/app_modules/auth/services/security.service';
import { AuthProvider } from '../models/enums/auth-provider.enum';
import { QueryFailedError } from 'typeorm';

describe('SocialAuthService', () => {
  it('should be defined', () => {
    const service = new SocialAuthService(
      {} as SocialProviderRegistry,
      {} as any,
      {} as any,
      {} as any,
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
      } as unknown as SecurityService,
      {
        forContext: jest.fn().mockReturnValue({ warn: jest.fn(), log: jest.fn() }),
      } as unknown as LoggerPort,
    );
    expect(service).toBeDefined();
  });

  it('converges on the committed identity after a concurrent unique race', async () => {
    const winner = '00000000-0000-0000-0000-000000000001';
    const provider = {
      getProfileFromCode: jest.fn().mockResolvedValue({
        provider: AuthProvider.Google,
        subject: 'immutable-subject',
        email: 'person@example.test',
        emailVerified: true,
        firstName: 'Person',
        lastName: 'Example',
      }),
    };
    const transactionRuns = [
      Promise.reject(new QueryFailedError('insert', [], new Error('duplicate key'))),
      Promise.resolve(winner),
    ];
    const unitOfWork = { run: jest.fn(() => transactionRuns.shift()) };
    const jwtTools = {
      generateToken: jest.fn().mockResolvedValue('sso-token'),
    };
    const testService = new SocialAuthService(
      { get: jest.fn().mockReturnValue(provider) } as unknown as SocialProviderRegistry,
      unitOfWork as any,
      {} as any,
      {} as any,
      {} as ScopeService,
      jwtTools as unknown as JwtToolsService,
      { get: jest.fn().mockReturnValue('secret') } as unknown as ConfigService,
      {} as RedisService,
      {} as SecurityService,
      { forContext: jest.fn().mockReturnValue({ warn: jest.fn() }) } as unknown as LoggerPort,
    );

    await expect(testService.loginWithProvider(AuthProvider.Google, 'code')).resolves.toBe('sso-token');
    expect(unitOfWork.run).toHaveBeenCalledTimes(2);
    expect(jwtTools.generateToken).toHaveBeenCalledWith(
      winner,
      expect.anything(),
    );
  });
});
