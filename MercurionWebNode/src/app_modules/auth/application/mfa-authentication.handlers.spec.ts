import {
    ApplicationErrorCode,
    type FingerprintData
} from '@mercurion/rest-contracts'

import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum'
import { getApplicationError } from 'src/exception-handling/application-error'
import { VerifyKind } from '../Models/enums/verify-kind.enum'
import {
    CompleteMfaLoginHandler,
    StartMfaChallengeHandler
} from './mfa-authentication.handlers'

describe('MFA authentication handlers', () => {
    describe('StartMfaChallengeHandler', () => {
        it.each([
            {
                strategyKey: 'EMAIL_OTP',
                tokenValid: true,
                outcome: 'sent'
            },
            {
                strategyKey: 'APP_TOTP',
                tokenValid: true,
                outcome: 'invalid-strategy'
            },
            {
                strategyKey: 'EMAIL_OTP',
                tokenValid: false,
                outcome: 'unauthorized'
            }
        ])('returns the explicit $outcome transition', async ({
            strategyKey,
            tokenValid,
            outcome
        }) => {
            const jwtTools = {
                verifyTokenAndGetPayload: tokenValid
                    ? jest.fn().mockResolvedValue({})
                    : jest.fn().mockRejectedValue(new Error('invalid'))
            }
            const mfaService = {
                sendOtpToUser: jest.fn().mockResolvedValue({
                    generatedAt: 10,
                    expiresAt: 20
                })
            }
            const operation = new StartMfaChallengeHandler(
                jwtTools as never,
                mfaService as never
            ).execute({
                preAuthorizationToken: 'pre-auth',
                strategyKey,
                trustVerify: false
            })

            if (outcome === 'sent') {
                await expect(operation).resolves.toEqual({
                    outcome: 'sent',
                    strategy: MfaStrategy.EMAIL_OTP,
                    generatedAt: 10,
                    expiresAt: 20
                })
            } else if (outcome === 'invalid-strategy') {
                await expect(operation).resolves.toEqual({
                    outcome: 'invalid-strategy'
                })
            } else {
                await expect(operation).resolves.toEqual({
                    outcome: 'invalid-token'
                })
            }
        })
    })

    describe('CompleteMfaLoginHandler', () => {
        const userId = '00000000-0000-4000-8000-000000000201'
        const sessionId = '00000000-0000-4000-8000-000000000202'
        const deviceId = '00000000-0000-4000-8000-000000000203'
        const jwtTools = { verifyTokenAndGetPayload: jest.fn() }
        const mfaService = {
            verifyUserOtpOrAppTotp: jest.fn(),
            verifyBackupCode: jest.fn()
        }
        const sessionService = {
            isSessionLongTerm: jest.fn(),
            revokeToken: jest.fn()
        }
        const redisService = { get: jest.fn() }
        const userService = { getUserInitialsByUserId: jest.fn() }
        const securityService = { signDeviceId: jest.fn() }
        const authenticationSession = {
            completeAuthenticatedSession: jest.fn()
        }
        const logger = { warn: jest.fn() }
        const loggerFactory = {
            forContext: jest.fn(() => logger)
        }
        const fingerprintData: FingerprintData = {
            audio: {},
            hardware: { videocard: {} },
            locales: {},
            plugins: {},
            screen: {},
            system: { platform: 'Windows' },
            webgl: {},
            math: {}
        }

        beforeEach(() => {
            jest.clearAllMocks()
            jwtTools.verifyTokenAndGetPayload.mockResolvedValue({
                sub: userId,
                sid: sessionId,
                jti: '00000000-0000-4000-8000-000000000204'
            })
            sessionService.isSessionLongTerm.mockResolvedValue(false)
            redisService.get.mockResolvedValue(deviceId)
            mfaService.verifyUserOtpOrAppTotp.mockResolvedValue(true)
            mfaService.verifyBackupCode.mockResolvedValue(true)
            authenticationSession.completeAuthenticatedSession
                .mockResolvedValue({
                    accessToken: 'access',
                    ws_accessToken: 'ws'
                })
            userService.getUserInitialsByUserId.mockResolvedValue('MF')
            securityService.signDeviceId.mockReturnValue('signed-device')
        })

        const createHandler = () => new CompleteMfaLoginHandler(
            jwtTools as never,
            mfaService as never,
            sessionService as never,
            redisService as never,
            userService as never,
            securityService as never,
            authenticationSession as never,
            loggerFactory as never
        )

        it.each([
            {
                strategyKey: 'EMAIL_OTP',
                body: {
                    kind: VerifyKind.TOTP,
                    payload: { totp: '123456' }
                },
                verification: 'otp'
            },
            {
                strategyKey: 'BACKUP_CODE',
                body: {
                    kind: VerifyKind.BACKUP,
                    payload: { code: 'backup-code' }
                },
                verification: 'backup'
            }
        ])('completes the $verification transition', async ({
            strategyKey,
            body,
            verification
        }) => {
            const result = await createHandler().execute({
                preAuthorizationToken: 'pre-auth',
                strategyKey,
                trustVerify: false,
                body,
                fingerprintData,
                ip: '127.0.0.1',
                actualDeviceId: deviceId,
                loginPendingValue: 'pending_long'
            })

            expect(result).toEqual({
                outcome: 'authenticated',
                accessToken: 'access',
                ws_accessToken: 'ws',
                initials: 'MF',
                signedDeviceId: 'signed-device',
                persistLogin: true
            })
            if (verification === 'otp') {
                expect(mfaService.verifyUserOtpOrAppTotp).toHaveBeenCalled()
            } else {
                expect(mfaService.verifyBackupCode).toHaveBeenCalled()
            }
        })

        it.each([
            {
                arrange: () => redisService.get.mockResolvedValue(
                    '00000000-0000-4000-8000-000000000299'
                ),
                code: ApplicationErrorCode.MFA_DEVICE_MISMATCH
            },
            {
                arrange: () => mfaService.verifyUserOtpOrAppTotp
                    .mockResolvedValue(false),
                code: ApplicationErrorCode.MFA_CODE_INVALID
            }
        ])('preserves the explicit MFA failure class $code', async ({
            arrange,
            code
        }) => {
            arrange()
            try {
                await createHandler().execute({
                    preAuthorizationToken: 'pre-auth',
                    strategyKey: 'EMAIL_OTP',
                    trustVerify: false,
                    body: {
                        kind: VerifyKind.TOTP,
                        payload: { totp: '123456' }
                    },
                    fingerprintData,
                    ip: '127.0.0.1',
                    actualDeviceId: deviceId,
                    loginPendingValue: 'pending_short'
                })
                throw new Error('Expected handler to fail')
            } catch (error) {
                expect(getApplicationError(error)?.code).toBe(code)
            }
        })

        it('returns an explicit invalid-strategy outcome', async () => {
            await expect(createHandler().execute({
                preAuthorizationToken: 'pre-auth',
                strategyKey: 'UNKNOWN',
                trustVerify: false,
                body: {
                    kind: VerifyKind.TOTP,
                    payload: { totp: '123456' }
                },
                fingerprintData,
                ip: '127.0.0.1',
                actualDeviceId: deviceId,
                loginPendingValue: 'pending_short'
            })).resolves.toEqual({ outcome: 'invalid-strategy' })
        })
    })
})
