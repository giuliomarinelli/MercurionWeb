jest.mock('./config/env-validation', () => ({
  validateEnvOrKillProcess: jest.fn((config) => config),
}));

import { Global, Inject, Injectable, Module } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import Redis from 'ioredis';
import { DataSource } from 'typeorm';
import { AdminModule } from './app_modules/admin/admin.module';
import { AuthModule } from './app_modules/auth/auth.module';
import { GlobalGuard } from './app_modules/auth/guards/global.guard';
import { JwtKeysProvider } from './app_modules/auth/providers/jwt-keys.provider';
import { RedisSessionRepository } from './app_modules/auth/repositories/redis-session.repository';
import { SessionIdentityService } from './app_modules/auth/services/session-identity.service';
import { JwtToolsService } from './app_modules/auth/services/jwt-tools.service';
import { SessionService } from './app_modules/auth/services/session.service';
import { SESSION_REPOSITORY } from './app_modules/auth/Models/interfaces/session-repository.interface';
import { MeiliLoggerService } from './app_modules/meilisearch/services/meili-logger.service';
import { RedisModule } from './app_modules/redis/redis.module';
import { PubSubService } from './app_modules/redis/services/pub-sub.service';
import { RedisService } from './app_modules/redis/services/redis.service';
import { SSO_Module } from './app_modules/sso/sso.module';
import { UserService } from './app_modules/user/services/user.service';
import { AppModule } from './app.module';
import { ResponseModule } from './services/response.module';
import { ResponseService } from './services/response.service';

const logger = {
  debug: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  verbose: jest.fn(),
  warn: jest.fn(),
};

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: {
        get: jest.fn((key: string) => {
          if (key === 'Jwt.issuer') return 'provider-ownership-test';
          if (key === 'Jwt.audience') {
            return { access: 'access', auth: 'auth', ws: 'ws' };
          }
          if (key === 'Jwt.accessToken' || key === 'Jwt.ws_accessToken') {
            return { expiresInMs: 60_000 };
          }
          if (key.startsWith('Jwt.')) {
            return { expiresInMs: 60_000, secret: 'x'.repeat(48) };
          }
          if (key === 'App.sessionSignatureSecret') return 'test-secret';
          if (key.startsWith('Session.')) return 60;
          return {};
        }),
      },
    },
    {
      provide: DataSource,
      useValue: {
        entityMetadatas: [],
        getMongoRepository: jest.fn(() => ({})),
        getRepository: jest.fn(() => ({})),
        getTreeRepository: jest.fn(() => ({})),
        options: { type: 'postgres' },
      },
    },
    {
      provide: MeiliLoggerService,
      useValue: { forContext: jest.fn(() => logger) },
    },
  ],
  exports: [ConfigService, DataSource, MeiliLoggerService],
})
class ProviderDependencyProbeModule {}

@Injectable()
class GuardConsumerProbe {
  constructor(
    @Inject(JwtToolsService) readonly jwtTools: JwtToolsService,
    @Inject(SessionService) readonly session: SessionService,
    @Inject(RedisService) readonly redis: RedisService,
  ) {}
}

@Injectable()
class FeatureConsumerProbe {
  constructor(
    @Inject(JwtToolsService) readonly jwtTools: JwtToolsService,
    @Inject(SessionService) readonly session: SessionService,
    @Inject(RedisService) readonly redis: RedisService,
    @Inject(ResponseService) readonly response: ResponseService,
  ) {}
}

@Module({
  imports: [AuthModule, RedisModule],
  providers: [GuardConsumerProbe],
  exports: [GuardConsumerProbe],
})
class GuardConsumerProbeModule {}

@Module({
  imports: [AuthModule, RedisModule, ResponseModule],
  providers: [FeatureConsumerProbe],
  exports: [FeatureConsumerProbe],
})
class FeatureConsumerProbeModule {}

function metadata<T>(moduleType: object, key: string): T[] {
  return (Reflect.getMetadata(key, moduleType) as T[] | undefined) ?? [];
}

describe('core Nest provider ownership', () => {
  it('declares governed providers only in their production owner modules', () => {
    const modules = [AppModule, AuthModule, RedisModule, ResponseModule, AdminModule, SSO_Module];
    const governedProviders = [
      GlobalGuard,
      JwtService,
      JwtToolsService,
      RedisService,
      ResponseService,
      RedisSessionRepository,
      SessionIdentityService,
      SessionService,
    ];

    const owners = new Map<object, object[]>(
      governedProviders.map((provider) => [
        provider,
        modules.filter((moduleType) =>
          metadata<object>(moduleType, MODULE_METADATA.PROVIDERS).includes(provider),
        ),
      ]),
    );

    expect(owners.get(GlobalGuard)).toEqual([AuthModule]);
    expect(owners.get(JwtService)).toEqual([AuthModule]);
    expect(owners.get(JwtToolsService)).toEqual([AuthModule]);
    expect(owners.get(RedisService)).toEqual([RedisModule]);
    expect(owners.get(ResponseService)).toEqual([ResponseModule]);
    expect(owners.get(RedisSessionRepository)).toEqual([AuthModule]);
    expect(owners.get(SessionIdentityService)).toEqual([AuthModule]);
    expect(owners.get(SessionService)).toEqual([AuthModule]);
  });

  it('imports owner modules and aliases APP_GUARD to the Auth-owned guard', () => {
    expect(metadata(AuthModule, MODULE_METADATA.IMPORTS)).toEqual(
      expect.arrayContaining([RedisModule, ResponseModule]),
    );
    expect(metadata(AdminModule, MODULE_METADATA.IMPORTS)).toContain(ResponseModule);
    expect(metadata(SSO_Module, MODULE_METADATA.IMPORTS)).toEqual(
      expect.arrayContaining([AuthModule, RedisModule, ResponseModule]),
    );

    const appProviders = metadata<Record<string, unknown>>(AppModule, MODULE_METADATA.PROVIDERS);
    expect(appProviders).toContainEqual({
      provide: APP_GUARD,
      useExisting: GlobalGuard,
    });
  });

  it('resolves one singleton per governed token through representative consumers', async () => {
    const builder = Test.createTestingModule({
      imports: [
        ProviderDependencyProbeModule,
        GuardConsumerProbeModule,
        FeatureConsumerProbeModule,
      ],
    });
    const governedProviders = new Set<unknown>([
      GlobalGuard,
      JwtService,
      JwtToolsService,
      RedisService,
      ResponseService,
      RedisSessionRepository,
      SessionIdentityService,
      SessionService,
      SESSION_REPOSITORY,
    ]);
    for (const provider of metadata<unknown>(AuthModule, MODULE_METADATA.PROVIDERS)) {
      const token =
        typeof provider === 'object' && provider !== null && 'provide' in provider
          ? provider.provide
          : provider;
      if (!governedProviders.has(token)) {
        builder.overrideProvider(token).useValue({});
      }
    }
    builder.overrideProvider(Redis).useValue({});
    builder.overrideProvider(PubSubService).useValue({});
    builder.overrideProvider(UserService).useValue({});
    builder.overrideProvider(JwtKeysProvider).useValue({
      getAccessKeyPair: () => ({ privateKey: 'private', publicKey: 'public' }),
      getWsKeyPair: () => ({ privateKey: 'private', publicKey: 'public' }),
    });

    const moduleRef = await builder.compile();

    const guardConsumer = moduleRef.get(GuardConsumerProbe);
    const featureConsumer = moduleRef.get(FeatureConsumerProbe);

    expect(guardConsumer.jwtTools).toBe(featureConsumer.jwtTools);
    expect(guardConsumer.session).toBe(featureConsumer.session);
    expect(guardConsumer.redis).toBe(featureConsumer.redis);
    expect(featureConsumer.response).toBe(moduleRef.get(ResponseService));
    expect(moduleRef.get(GlobalGuard)).toBeInstanceOf(GlobalGuard);
    expect(moduleRef.get(JwtToolsService)).toBeInstanceOf(JwtToolsService);
    expect(moduleRef.get(SessionService)).toBeInstanceOf(SessionService);
    expect(moduleRef.get(RedisService)).toBeInstanceOf(RedisService);
    expect(moduleRef.get(ResponseService)).toBeInstanceOf(ResponseService);
    expect(moduleRef.get(RedisSessionRepository)).toBeInstanceOf(RedisSessionRepository);
    expect(moduleRef.get(SessionIdentityService)).toBeInstanceOf(SessionIdentityService);

    const authModule = moduleRef.select(AuthModule);
    const jwtService = authModule.get(JwtService, { strict: true });
    expect(jwtService).toBeInstanceOf(JwtService);
    expect(
      (guardConsumer.jwtTools as unknown as { jwtService: JwtService }).jwtService,
    ).toBe(jwtService);
    const sessionRepository = (
      guardConsumer.session as unknown as { repository: RedisSessionRepository }
    ).repository;
    expect(sessionRepository).toBe(moduleRef.get(RedisSessionRepository));
    expect(
      (sessionRepository as unknown as { redisService: RedisService }).redisService,
    ).toBe(guardConsumer.redis);
  });
});
