import { AccountFlowKernel } from './account-flow-kernel';
import { ScopeService } from '../services/scope.service';
import { UnitOfWork } from 'src/persistence/transaction-context';
import { ApplicationErrorCode } from 'src/exception-handling/application-error';
import { TokenType } from '../models/enums/token-type.enum';
import { ActivationReceipt } from '../models/entities/activation-receipt.entity';

describe('AccountFlowKernel', () => {
  let service: AccountFlowKernel;
  let userServiceMock: { existsUserByEmail: jest.Mock; activateAccount: jest.Mock };
  let redisServiceMock: { exists: jest.Mock; del: jest.Mock };
  let jwtToolsMock: { verifyTokenAndGetPayload: jest.Mock };
  let securityServiceMock: {
    decryptUserId: jest.Mock;
    decrypt_AES256_GCM: jest.Mock;
    generateAccountRecoveryReadableCode: jest.Mock;
    encrypt_AES256_GCM: jest.Mock;
  };
  let sessionServiceMock: { isTokenRevoked: jest.Mock; revokeToken: jest.Mock };
  let passwordEncoderMock: { encode: jest.Mock };
  let receiptManager: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let initialWorkspaceMock: { initializeForUser: jest.Mock };

  beforeEach(() => {
    userServiceMock = { existsUserByEmail: jest.fn(), activateAccount: jest.fn() };
    redisServiceMock = { exists: jest.fn(), del: jest.fn() };
    jwtToolsMock = { verifyTokenAndGetPayload: jest.fn() };
    securityServiceMock = {
      decryptUserId: jest.fn().mockReturnValue('user-id'),
      decrypt_AES256_GCM: jest.fn().mockReturnValue('recovery-code'),
      generateAccountRecoveryReadableCode: jest.fn().mockReturnValue('recovery-code'),
      encrypt_AES256_GCM: jest.fn().mockReturnValue('encrypted-code')
    };
    sessionServiceMock = { isTokenRevoked: jest.fn(), revokeToken: jest.fn() };
    passwordEncoderMock = { encode: jest.fn().mockResolvedValue('hashed-code') };
    receiptManager = {
      findOne: jest.fn(),
      create: jest.fn((_entity, value) => value),
      save: jest.fn()
    };
    initialWorkspaceMock = { initializeForUser: jest.fn() };
    const unitOfWork = new UnitOfWork({
      transaction: async (work: (manager: typeof receiptManager) => Promise<unknown>) => work(receiptManager)
    } as any);
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
      passwordEncoderMock as any, // passwordEncoder
      securityServiceMock as any, // securityService
      jwtToolsMock as any, // jwtTools
      configMock as any, // configService
      {} as any, // mailService
      {} as any, // smsService
      redisServiceMock as any, // redisService
      {} as any, // attempts
      sessionServiceMock as any, // sessionService
      { ok: jest.fn().mockReturnValue({ status: 200 }) } as any, // responseService
      {} as any, // securityAuditService
      {} as any, // dataSource
      {} as ScopeService, // scopeService
      unitOfWork, // unitOfWork
      initialWorkspaceMock as any, // initialWorkspace
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

  describe('activation token revocation', () => {
    const jti = 'activation-jti';

    beforeEach(() => {
      jwtToolsMock.verifyTokenAndGetPayload.mockResolvedValue({ sub: 'encrypted-user-id', jti });
    });

    it('replays a committed receipt even when its token was revoked after commit', async () => {
      receiptManager.findOne.mockResolvedValue({ jti, userId: 'user-id', recoveryCode: 'encrypted-code' });

      await expect(service.activateUser('signed-token')).resolves.toEqual({
        status: 200,
        recoveryCode: 'recovery-code'
      });
      expect(jwtToolsMock.verifyTokenAndGetPayload).toHaveBeenCalledWith(
        'signed-token', TokenType.ActivationToken, false, true
      );
      expect(receiptManager.findOne).toHaveBeenCalledWith(ActivationReceipt, { where: { jti } });
      expect(sessionServiceMock.isTokenRevoked).not.toHaveBeenCalled();
      expect(userServiceMock.activateAccount).not.toHaveBeenCalled();
    });

    it('rejects a receipt associated with a different user', async () => {
      receiptManager.findOne.mockResolvedValue({ jti, userId: 'another-user', recoveryCode: 'encrypted-code' });

      await expect(service.activateUser('signed-token')).rejects.toMatchObject({
        code: ApplicationErrorCode.TOKEN_INVALID_OR_EXPIRED
      });
      expect(securityServiceMock.decrypt_AES256_GCM).not.toHaveBeenCalled();
      expect(sessionServiceMock.isTokenRevoked).not.toHaveBeenCalled();
    });

    it('rejects a revoked token with no committed receipt', async () => {
      receiptManager.findOne.mockResolvedValue(null);
      sessionServiceMock.isTokenRevoked.mockResolvedValue(true);

      await expect(service.activateUser('signed-token')).rejects.toMatchObject({
        code: ApplicationErrorCode.TOKEN_INVALID_OR_EXPIRED
      });
      expect(sessionServiceMock.isTokenRevoked).toHaveBeenCalledWith(jti);
      expect(securityServiceMock.generateAccountRecoveryReadableCode).not.toHaveBeenCalled();
      expect(userServiceMock.activateAccount).not.toHaveBeenCalled();
    });

    it('activates an unrevoked token with no committed receipt', async () => {
      receiptManager.findOne.mockResolvedValue(null);
      sessionServiceMock.isTokenRevoked.mockResolvedValue(false);
      userServiceMock.activateAccount.mockResolvedValue({ email: 'person@example.com' });

      await expect(service.activateUser('signed-token')).resolves.toEqual({
        status: 200,
        recoveryCode: 'recovery-code'
      });
      expect(sessionServiceMock.isTokenRevoked).toHaveBeenCalledWith(jti);
      expect(userServiceMock.activateAccount).toHaveBeenCalledTimes(1);
      expect(receiptManager.save).toHaveBeenCalledWith(expect.objectContaining({
        jti,
        recoveryCode: 'encrypted-code'
      }));
    });
  });
});
