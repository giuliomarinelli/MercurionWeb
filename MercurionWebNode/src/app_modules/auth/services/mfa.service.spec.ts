import { MfaApplicationService } from './mfa.service';
import { MfaStrategy } from 'src/app_modules/user/models/enums/mfa-strategy.enum';

describe('MfaApplicationService', () => {
  let service: MfaApplicationService;
  let userServiceMock: any;
  let dataSourceMock: any;
  let securityServiceMock: any;
  let mailServiceMock: any;
  let jwtToolsMock: any;
  let policyMock: any;

  beforeEach(() => {
    const configServiceMock = {
      get: jest.fn((key: string) => {
        if (key === 'Totp') return { period: 300 };
        if (key === 'App.globalName') return 'MockApp';
        return undefined;
      }),
    };
    const loggerMock = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    userServiceMock = {};
    dataSourceMock = {};
    securityServiceMock = {};
    mailServiceMock = { send: jest.fn().mockResolvedValue(undefined) };
    jwtToolsMock = { generateToken: jest.fn().mockResolvedValue('secure-token') };
    policyMock = {
      throttleSend: jest.fn().mockResolvedValue(undefined),
      clearFailures: jest.fn().mockResolvedValue(undefined),
    };

    service = new MfaApplicationService(
      {} as any, // backupCodeRepository
      dataSourceMock as any,
      {} as any, // passwordEncoderService
      securityServiceMock as any,
      userServiceMock as any,
      {} as any, // smsService
      mailServiceMock as any,
      configServiceMock as any, // configService
      jwtToolsMock as any,
      {} as any, // sessionService
      {} as any, // redisService
      {} as any, // securityAuditService
      policyMock as any,
      { publishToUser: jest.fn(), publishAfterCommit: jest.fn() } as any, // stateSync
      { forContext: jest.fn().mockReturnValue(loggerMock) } as any // meiliLogger
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('sends email MFA activation codes to the user email address', async () => {
    const userId = '00000000-0000-0000-0000-000000000001' as any;
    dataSourceMock.getRepository = jest.fn().mockReturnValue({
      findOne: jest.fn().mockResolvedValue({ sso: false }),
    });
    userServiceMock.existsUserById = jest.fn().mockResolvedValue(true);
    userServiceMock.getUserFirstNameById = jest.fn().mockResolvedValue('Test');
    userServiceMock.getUserEncryptedEnabledMfaStrategies = jest.fn().mockResolvedValue([]);
    userServiceMock.getUserEmailById = jest.fn().mockResolvedValue('contact@example.test');
    userServiceMock.getOtpSecretByUserId = jest.fn().mockResolvedValue('otp-secret');
    securityServiceMock.generateTotp = jest.fn().mockReturnValue({
      TOTP: '123456',
      generatedAt: 100,
      expiresAt: 400,
    });

    await expect(service.enableMfa_firstStep(userId, MfaStrategy.EMAIL_OTP)).resolves.toEqual({
      generatedAt: 100,
      expiresAt: 400,
      secureToken: 'secure-token',
    });

    expect(userServiceMock.getUserEmailById).toHaveBeenCalledWith(userId);
    expect(mailServiceMock.send).toHaveBeenCalledWith('mfa-enable-code', 'contact@example.test', {
      firstName: 'Test',
      totp: '123456',
      period: 300,
      appName: 'MockApp',
    });
    expect(jwtToolsMock.generateToken).toHaveBeenCalledWith(userId, expect.any(String));
  });
});
