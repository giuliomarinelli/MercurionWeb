import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModulesContainer, Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AuthModule } from '../auth/auth.module';
import { JwtToolsService } from '../auth/services/jwt-tools.service';
import { ScopeService } from '../auth/services/scope.service';
import { SecureCookieService } from '../auth/services/secure-cookie.service';
import { SessionService } from '../auth/services/session.service';
import { MeilisearchModule } from '../meilisearch/meilisearch.module';
import { MeiliLoggerService } from '../meilisearch/services/meili-logger.service';
import { RedisModule } from '../redis/redis.module';
import { PubSubService } from '../redis/services/pub-sub.service';
import { SocketIOGateway } from './socket.io.gateway';
import { SocketIoModule } from './socket.io.module';

const logger = {
  debug: jest.fn(),
  error: jest.fn(),
  log: jest.fn(),
  warn: jest.fn(),
};

@Global()
@Module({
  providers: [
    {
      provide: ConfigService,
      useValue: {
        get: jest.fn().mockReturnValue({ host: 'localhost', port: 6379 }),
      },
    },
    {
      provide: PubSubService,
      useValue: { setSocketServer: jest.fn() },
    },
  ],
  exports: [ConfigService, PubSubService],
})
class SocketRedisProbeModule {}

@Global()
@Module({
  providers: [
    {
      provide: JwtToolsService,
      useValue: { verifyTokenAndGetPayload: jest.fn() },
    },
    {
      provide: SessionService,
      useValue: {},
    },
    {
      provide: SecureCookieService,
      useValue: {},
    },
    {
      provide: ScopeService,
      useValue: {},
    },
    Reflector,
  ],
  exports: [JwtToolsService, SessionService, SecureCookieService, ScopeService, Reflector],
})
class SocketAuthProbeModule {}

@Global()
@Module({
  providers: [
    {
      provide: MeiliLoggerService,
      useValue: { forContext: jest.fn().mockReturnValue(logger) },
    },
  ],
  exports: [MeiliLoggerService],
})
class SocketMeilisearchProbeModule {}

describe('SocketIoModule', () => {
  it('should be defined', () => {
    expect(new SocketIoModule()).toBeDefined();
  });

  it('creates exactly one gateway provider wrapper and instance per app context', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [SocketIoModule],
    })
      .overrideModule(RedisModule)
      .useModule(SocketRedisProbeModule)
      .overrideModule(AuthModule)
      .useModule(SocketAuthProbeModule)
      .overrideModule(MeilisearchModule)
      .useModule(SocketMeilisearchProbeModule)
      .compile();

    const gateway = moduleRef.get(SocketIOGateway);
    const gatewayProviders = [...moduleRef.get(ModulesContainer).values()]
      .map((module) => module.providers.get(SocketIOGateway))
      .filter((provider) => provider !== undefined);

    expect(gatewayProviders).toHaveLength(1);
    expect(gatewayProviders[0]?.instance).toBe(gateway);
    expect(moduleRef.get(SocketIOGateway)).toBe(gateway);

    await moduleRef.close();
  });
});
