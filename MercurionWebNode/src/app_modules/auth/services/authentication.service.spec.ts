import { AuthenticationService } from './authentication.service';
import { CompareResult } from '../Models/enums/compare-result.enum';

describe('AuthenticationService', () => {
  let service: AuthenticationService;
  const originalAppEnv = process.env.APP_ENV;
  const originalTestEmail = process.env.LOCAL_TEST_ACCOUNT_EMAIL;

  const passwordEncoder = {
    compareWithFallback: jest.fn(),
    needsRehash: jest.fn(),
    encode: jest.fn(),
  };
  const userService = {
    getVerifiedUserAuthByEmail: jest.fn(),
    getPhoneNumberById: jest.fn(),
    migratePasswordHash: jest.fn(),
  };
  const sessionService = {
    isKnownDeviceId: jest.fn(),
    getTrustedLocations: jest.fn(),
    createSession: jest.fn(),
    isFingerprintInWhiteList: jest.fn(),
    activateSession: jest.fn(),
  };
  const securityService = { maskEmail: jest.fn() };
  const mfaService = { getEnabledMfaStrategies: jest.fn() };
  const geoIpService = {
    getLocation: jest.fn(),
    isTrustedLocation: jest.fn(),
  };
  const redisService = {
    exists: jest.fn(),
    del: jest.fn(),
    getClient: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthenticationService(
      passwordEncoder as any,
      userService as any,
      sessionService as any,
      securityService as any,
      mfaService as any,
      {} as any, // jwtTools
      {} as any, // responseService
      geoIpService as any,
      redisService as any,
    );
  });

  afterAll(() => {
    if (originalAppEnv === undefined) delete process.env.APP_ENV;
    else process.env.APP_ENV = originalAppEnv;
    if (originalTestEmail === undefined) delete process.env.LOCAL_TEST_ACCOUNT_EMAIL;
    else process.env.LOCAL_TEST_ACCOUNT_EMAIL = originalTestEmail;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('never forces MFA or suspiciousAttempt for the configured development test account', async () => {
    process.env.APP_ENV = 'development';
    process.env.LOCAL_TEST_ACCOUNT_EMAIL = 'automation@example.test';
    const userId = '00000000-0000-4000-8000-000000000201';
    const sessionId = '00000000-0000-4000-8000-000000000202';

    redisService.exists.mockResolvedValue(false);
    userService.getVerifiedUserAuthByEmail.mockResolvedValue({
      userId,
      passwordHash: 'encoded-password',
      locked: false,
    });
    passwordEncoder.compareWithFallback.mockResolvedValue(CompareResult.MatchPeppered);
    passwordEncoder.needsRehash.mockResolvedValue(false);
    sessionService.isKnownDeviceId.mockResolvedValue(false);
    sessionService.getTrustedLocations.mockResolvedValue([]);
    sessionService.createSession.mockResolvedValue({ sessionId });
    sessionService.isFingerprintInWhiteList.mockResolvedValue(false);
    userService.getPhoneNumberById.mockResolvedValue(null);
    geoIpService.getLocation.mockReturnValue({
      city: null,
      country: null,
      ip: '127.0.0.1',
      region: null,
      latitude: 0,
      longitude: 0,
    });
    geoIpService.isTrustedLocation.mockReturnValue(false);

    const result = await service.emailAndPasswordAuthentication(
      'AUTOMATION@example.test',
      'test-password',
      true,
      '127.0.0.1',
      '00000000-0000-4000-8000-000000000203',
      { browser: { name: 'Chrome' } },
      { system: { platform: 'Windows' } } as any,
    );

    expect(result).toEqual(expect.objectContaining({
      needsMfa: false,
      suspiciousAttempt: false,
      enabledMfaStrategies: [],
    }));
    expect(sessionService.activateSession).toHaveBeenCalledWith(sessionId, userId);
    expect(mfaService.getEnabledMfaStrategies).not.toHaveBeenCalled();
    expect(securityService.maskEmail).not.toHaveBeenCalled();
  });

  it('retains adaptive email MFA for any other account', async () => {
    process.env.APP_ENV = 'development';
    process.env.LOCAL_TEST_ACCOUNT_EMAIL = 'automation@example.test';
    const userId = '00000000-0000-4000-8000-000000000211';
    const sessionId = '00000000-0000-4000-8000-000000000212';

    redisService.exists.mockResolvedValue(false);
    userService.getVerifiedUserAuthByEmail.mockResolvedValue({
      userId,
      passwordHash: 'encoded-password',
      locked: false,
    });
    passwordEncoder.compareWithFallback.mockResolvedValue(CompareResult.MatchPeppered);
    passwordEncoder.needsRehash.mockResolvedValue(false);
    sessionService.isKnownDeviceId.mockResolvedValue(false);
    sessionService.getTrustedLocations.mockResolvedValue([]);
    sessionService.createSession.mockResolvedValue({ sessionId });
    sessionService.isFingerprintInWhiteList.mockResolvedValue(false);
    userService.getPhoneNumberById.mockResolvedValue(null);
    mfaService.getEnabledMfaStrategies.mockResolvedValue([]);
    securityService.maskEmail.mockReturnValue('o***@example.test');
    geoIpService.getLocation.mockReturnValue({
      city: null,
      country: null,
      ip: '127.0.0.1',
      region: null,
      latitude: 0,
      longitude: 0,
    });
    geoIpService.isTrustedLocation.mockReturnValue(false);

    const result = await service.emailAndPasswordAuthentication(
      'ordinary@example.test',
      'test-password',
      true,
      '127.0.0.1',
      '00000000-0000-4000-8000-000000000213',
      { browser: { name: 'Chrome' } },
      { system: { platform: 'Windows' } } as any,
    );

    expect(result).toEqual(expect.objectContaining({
      needsMfa: true,
      suspiciousAttempt: true,
      enabledMfaStrategies: ['EMAIL_OTP'],
    }));
    expect(sessionService.activateSession).not.toHaveBeenCalled();
    expect(mfaService.getEnabledMfaStrategies).toHaveBeenCalledWith(userId);
  });
});
