import { MfaApplicationService } from './mfa.service';

describe('MfaApplicationService', () => {
  let service: MfaApplicationService;

  beforeEach(() => {
    const configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'Totp') return {};
        if (key === 'App.globalName') return 'MockApp';
        return undefined;
      }),
    };
    const loggerMock = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

    service = new MfaApplicationService(
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
      {} as any, // policy
      { forContext: jest.fn().mockReturnValue(loggerMock) } as any // meiliLogger
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
