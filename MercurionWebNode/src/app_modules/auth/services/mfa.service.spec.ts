import { MfaService } from './mfa.service';

describe('MfaService', () => {
  let service: MfaService;

  beforeEach(() => {
    const configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'Totp') return {};
        if (key === 'App.globalName') return 'MockApp';
        return undefined;
      }),
    };
    const loggerMock = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

    service = new MfaService(
      {} as any, // backupCodeRepository
      {} as any, // dataSource
      {} as any, // passwordEncoderService
      {} as any, // securityService
      {} as any, // userService
      {} as any, // smsService
      {} as any, // mailService
      configServiceMock as any, // configService
      {} as any, // jwtTools
      {} as any, // sessionService
      {} as any, // redisService
      {} as any, // securityAuditService
      { forContext: jest.fn().mockReturnValue(loggerMock) } as any // meiliLogger
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
