import { JwtToolsService } from './jwt-tools.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { TokenType } from '../Models/enums/token-type.enum';

jest.mock('src/config/config', () => ({
  Environment: {
    Development: 'development',
    Staging: 'staging',
    Production: 'production',
    Test: 'test',
  },
}));

jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue('-----BEGIN KEY-----\nmock\n-----END KEY-----'),
}));

const jwtKeysMock = {
  getAccessKeyPair: () => ({
    privateKey: '-----BEGIN KEY-----\naccess\n-----END KEY-----',
    publicKey: '-----BEGIN KEY-----\naccess\n-----END KEY-----',
  }),
  getWsKeyPair: () => ({
    privateKey: '-----BEGIN KEY-----\nws\n-----END KEY-----',
    publicKey: '-----BEGIN KEY-----\nws\n-----END KEY-----',
  })
}

describe('JwtToolsService', () => {
  let service: JwtToolsService;
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock; decode: jest.Mock };
  let sessionService: {
    isTokenRevoked: jest.Mock;
    registerIssuedToken: jest.Mock;
    revokeToken: jest.Mock;
  };

  beforeEach(() => {
    const configMock = {
      get: jest.fn((key: string) => {
        if (key === 'Jwt.accessToken.expiresInMs') return 3600_000;
        if (key === 'Jwt.ws_accessToken.expiresInMs') return 3600_000;
        if (key === 'Jwt.issuer') return 'issuer';
        if (key === 'Jwt.audience') return { access: 'access', ws: 'ws', auth: 'auth' };
        if (key === 'Session.sessionZeroId') return '00000000-0000-4000-8000-000000000000';
        if (key.startsWith('Jwt.') && key.endsWith('Token')) {
          return { secret: 's'.repeat(64), expiresInMs: 3600_000 };
        }
        return undefined;
      }),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue('token'),
      verifyAsync: jest.fn(),
      decode: jest.fn()
    };
    sessionService = {
      isTokenRevoked: jest.fn().mockResolvedValue(false),
      registerIssuedToken: jest.fn(),
      revokeToken: jest.fn()
    };

    service = new JwtToolsService(
      jwtService as unknown as JwtService,
      configMock as unknown as ConfigService,
      { getUserScopesById: jest.fn().mockResolvedValue([]) },
      sessionService as any,
      {
        forContext: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn() }),
      } as unknown as MeiliLoggerService,
      jwtKeysMock as any
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('registers issued access tokens through the session application API', async () => {
    const userId = '11111111-1111-4111-8111-111111111111';
    const sessionId = '22222222-2222-4222-8222-222222222222';

    await expect(
      service.generateToken(userId, TokenType.AccessToken, sessionId)
    ).resolves.toBe('token');
    expect(sessionService.registerIssuedToken).toHaveBeenCalledWith(
      sessionId,
      expect.any(String),
      3600
    );
  });
});
