import { AccountService } from './account.service';

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
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
