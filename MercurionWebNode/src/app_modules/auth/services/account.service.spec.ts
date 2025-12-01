import { AccountService } from './account.service';
import { ScopeService } from './scope.service';

describe('AccountService', () => {
  let service: AccountService;

  beforeEach(() => {
    const configMock = {
      get: jest.fn((key: string) => {
        if (key === 'Jwt.changePasswordToken.expiresInMs') return 300000;
        if (key === 'App.redisIdHmacSecret') return 'secret';
        return undefined;
      }),
    };
    const meiliLoggerMock = { forContext: jest.fn(() => ({ warn: jest.fn() })) };
    service = new AccountService(
      {} as any, // userService
      {} as any, // passwordEncoder
      {} as any, // securityService
      {} as any, // jwtTools
      configMock as any, // configService
      {} as any, // mailService
      {} as any, // smsService
      {} as any, // redisService
      {} as any, // sessionService
      {} as any, // responseService
      {} as any, // securityAuditService
      {} as any, // dataSource
      {} as ScopeService, // scopeService
      meiliLoggerMock as any, // meiliLogger
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
