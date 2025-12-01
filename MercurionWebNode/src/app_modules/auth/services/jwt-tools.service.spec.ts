import { JwtToolsService } from './jwt-tools.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';

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

jest.mock('src/app_modules/user/services/user.service', () => ({
  UserService: class {
    getUserScopesById = jest.fn().mockResolvedValue([]);
  },
}));

describe('JwtToolsService', () => {
  let service: JwtToolsService;

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

    service = new JwtToolsService(
      { signAsync: jest.fn(), verifyAsync: jest.fn(), decode: jest.fn() } as unknown as JwtService,
      configMock as unknown as ConfigService,
      { getUserScopesById: jest.fn().mockResolvedValue([]) } as any,
      { set: jest.fn() } as any,
      { isTokenRevoked: jest.fn().mockResolvedValue(false), revokeToken: jest.fn() } as any,
      {
        forContext: jest.fn().mockReturnValue({ log: jest.fn(), warn: jest.fn() }),
      } as unknown as MeiliLoggerService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
