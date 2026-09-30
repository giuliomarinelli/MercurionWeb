import { AccountFlowKernel } from './account-flow-kernel';
import { ScopeService } from '../services/scope.service';

describe('AccountFlowKernel', () => {
  let service: AccountFlowKernel;
  let userServiceMock: { existsUserByEmail: jest.Mock };
  let redisServiceMock: { exists: jest.Mock };

  beforeEach(() => {
    userServiceMock = { existsUserByEmail: jest.fn() };
    redisServiceMock = { exists: jest.fn() };
    const configMock = {
      get: jest.fn((key: string) => {
        if (key === 'Jwt.changePasswordToken.expiresInMs') return 300000;
        if (key === 'App.redisIdHmacSecret') return 'secret';
        return undefined;
      }),
    };
    const meiliLoggerMock = { forContext: jest.fn(() => ({ warn: jest.fn() })) };
    service = new AccountFlowKernel(
      userServiceMock as any, // userService
      {} as any, // passwordEncoder
      {} as any, // securityService
      {} as any, // jwtTools
      configMock as any, // configService
      {} as any, // mailService
      {} as any, // smsService
      redisServiceMock as any, // redisService
      {} as any, // attempts
      {} as any, // sessionService
      {} as any, // responseService
      {} as any, // securityAuditService
      {} as any, // dataSource
      {} as ScopeService, // scopeService
      {} as any, // unitOfWork
      {} as any, // initialWorkspace
      {} as any, // notificationOutbox
      meiliLoggerMock as any, // meiliLogger
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it.each([
    ['registered user', true, false, false],
    ['two-hour Redis lock', false, true, false],
    ['available address', false, false, true]
  ])('checks email availability for %s', async (_case, userExists, lockExists, available) => {
    userServiceMock.existsUserByEmail.mockResolvedValue(userExists);
    redisServiceMock.exists.mockResolvedValue(lockExists);

    await expect(service.isUserAvailableByEmail('  Person@Example.com  ')).resolves.toBe(available);
    expect(userServiceMock.existsUserByEmail).toHaveBeenCalledWith('person@example.com');
    expect(redisServiceMock.exists).toHaveBeenCalledTimes(1);
  });
});
