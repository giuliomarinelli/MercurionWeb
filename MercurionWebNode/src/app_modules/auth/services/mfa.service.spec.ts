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

  service = new MfaService(
    {} as any, // SecurityService
    {} as any, // UserService
    {} as any, // PasswordEncoderService
    {} as any, // backupCodeRepository
    {} as any, // SmsSenderService
    {} as any, // MailSenderService
    configServiceMock as any, // ConfigService
    {} as any, // JwtToolsService
    {} as any, // SessionService
    {} as any, // RedisService
  );
});
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
