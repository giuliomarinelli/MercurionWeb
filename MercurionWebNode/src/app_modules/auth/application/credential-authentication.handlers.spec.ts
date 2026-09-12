import { CompareResult } from '../Models/enums/compare-result.enum'
import {
    CredentialLoginHandler,
    VerifyEmailHandler
} from './credential-authentication.handlers'
import { getApplicationError } from 'src/exception-handling/application-error'
import { ApplicationErrorCode } from '@mercurion/rest-contracts'

describe('credential authentication handlers', () => {
    describe('VerifyEmailHandler', () => {
        it.each([
            { exists: true, outcome: 'verified' },
            { exists: false, outcome: 'unauthorized' }
        ])('returns the explicit $outcome transition', async ({ exists, outcome }) => {
            const handler = new VerifyEmailHandler({
                existsUserByEmail: jest.fn().mockResolvedValue(exists)
            } as never)
            const operation = handler.execute({ email: 'user@example.com' })

            await expect(operation).resolves.toEqual({
                verified: outcome === 'verified'
            })
        })
    })

    describe('CredentialLoginHandler', () => {
        const originalAppEnv = process.env.APP_ENV
        const originalTestEmail = process.env.LOCAL_TEST_ACCOUNT_EMAIL
        const userId = '00000000-0000-4000-8000-000000000101'
        const sessionId = '00000000-0000-4000-8000-000000000102'
        const deviceId = '00000000-0000-4000-8000-000000000103'
        const passwordEncoder = {
            compareWithFallback: jest.fn(),
            needsRehash: jest.fn(),
            encode: jest.fn()
        }
        const userService = {
            getVerifiedUserAuthByEmail: jest.fn(),
            migratePasswordHash: jest.fn(),
            getPhoneNumberById: jest.fn(),
            getUserInitialsByUserId: jest.fn()
        }
        const sessionService = {
            isKnownDeviceId: jest.fn(),
            getTrustedLocations: jest.fn(),
            createSession: jest.fn(),
            isFingerprintInWhiteList: jest.fn(),
            activateSession: jest.fn()
        }
        const securityService = {
            maskEmail: jest.fn((value: string) => `masked:${value}`),
            signDeviceId: jest.fn(() => 'signed-device')
        }
        const mfaService = { getEnabledMfaStrategies: jest.fn() }
        const geoIpService = {
            getLocation: jest.fn(),
            isTrustedLocation: jest.fn()
        }
        const redisClient = { incr: jest.fn() }
        const redisService = {
            exists: jest.fn(),
            del: jest.fn(),
            set: jest.fn(),
            setTTL: jest.fn(),
            getClient: jest.fn(() => redisClient)
        }
        const authenticationSession = {
            generateFingerprint: jest.fn(() => 'fingerprint'),
            createMfaPreAuthorizationToken: jest.fn(),
            completeAuthenticatedSession: jest.fn()
        }

        beforeEach(() => {
            jest.clearAllMocks()
            process.env.APP_ENV = 'development'
            process.env.LOCAL_TEST_ACCOUNT_EMAIL = 'automation@example.test'
            redisService.exists.mockResolvedValue(false)
            userService.getVerifiedUserAuthByEmail.mockResolvedValue({
                userId,
                passwordHash: 'encoded-password',
                locked: false
            })
            passwordEncoder.compareWithFallback.mockResolvedValue(
                CompareResult.MatchPeppered
            )
            passwordEncoder.needsRehash.mockResolvedValue(false)
            sessionService.isKnownDeviceId.mockResolvedValue(true)
            sessionService.getTrustedLocations.mockResolvedValue([])
            sessionService.createSession.mockResolvedValue({ sessionId })
            sessionService.isFingerprintInWhiteList.mockResolvedValue(true)
            userService.getPhoneNumberById.mockResolvedValue(null)
            userService.getUserInitialsByUserId.mockResolvedValue('AT')
            mfaService.getEnabledMfaStrategies.mockResolvedValue([])
            geoIpService.getLocation.mockReturnValue({
                city: null,
                country: null,
                ip: '127.0.0.1',
                region: null,
                latitude: 0,
                longitude: 0
            })
            geoIpService.isTrustedLocation.mockReturnValue(true)
            authenticationSession.createMfaPreAuthorizationToken
                .mockResolvedValue('pre-auth')
            authenticationSession.completeAuthenticatedSession
                .mockResolvedValue({
                    accessToken: 'access',
                    ws_accessToken: 'ws'
                })
        })

        afterAll(() => {
            if (originalAppEnv === undefined) delete process.env.APP_ENV
            else process.env.APP_ENV = originalAppEnv
            if (originalTestEmail === undefined) {
                delete process.env.LOCAL_TEST_ACCOUNT_EMAIL
            } else {
                process.env.LOCAL_TEST_ACCOUNT_EMAIL = originalTestEmail
            }
        })

        const createHandler = () => new CredentialLoginHandler(
            passwordEncoder as never,
            userService as never,
            sessionService as never,
            securityService as never,
            mfaService as never,
            geoIpService as never,
            redisService as never,
            authenticationSession as never
        )

        it.each([
            {
                email: 'AUTOMATION@example.test',
                knownDevice: false,
                trustedFingerprint: false,
                trustedLocation: false,
                expectedNext: 'authenticated'
            },
            {
                email: 'ordinary@example.test',
                knownDevice: false,
                trustedFingerprint: false,
                trustedLocation: false,
                expectedNext: 'mfa'
            }
        ])('returns $expectedNext for $email without changing adaptive policy', async ({
            email,
            knownDevice,
            trustedFingerprint,
            trustedLocation,
            expectedNext
        }) => {
            sessionService.isKnownDeviceId.mockResolvedValue(knownDevice)
            sessionService.isFingerprintInWhiteList.mockResolvedValue(
                trustedFingerprint
            )
            geoIpService.isTrustedLocation.mockReturnValue(trustedLocation)

            const result = await createHandler().execute({
                email,
                password: 'test-password',
                remember: true,
                ip: '127.0.0.1',
                deviceId,
                sessionDeviceInfo: { browser: { name: 'Chrome' } },
                fingerprintData: {
                    system: { platform: 'Windows' }
                } as never
            })

            expect(result.next).toBe(expectedNext)
            if (expectedNext === 'authenticated') {
                expect(result).toEqual(expect.objectContaining({
                    needsMfa: false,
                    suspiciousAttempt: false,
                    enabledMfaStrategies: []
                }))
                expect(mfaService.getEnabledMfaStrategies).not.toHaveBeenCalled()
            } else {
                expect(result).toEqual(expect.objectContaining({
                    needsMfa: true,
                    suspiciousAttempt: true,
                    enabledMfaStrategies: ['EMAIL_OTP'],
                    preAuthorizationToken: 'pre-auth'
                }))
            }
        })

        it.each([
            {
                arrange: () => redisService.exists.mockResolvedValue(true),
                code: ApplicationErrorCode.AUTHENTICATION_TOO_MANY_ATTEMPTS
            },
            {
                arrange: () => passwordEncoder.compareWithFallback
                    .mockResolvedValue(CompareResult.NoMatch),
                code: ApplicationErrorCode.AUTHENTICATION_INVALID_CREDENTIALS
            }
        ])('preserves the explicit credential failure class $code', async ({
            arrange,
            code
        }) => {
            arrange()
            redisClient.incr.mockResolvedValue(1)

            try {
                await createHandler().execute({
                    email: 'ordinary@example.test',
                    password: 'wrong',
                    remember: false,
                    ip: '127.0.0.1',
                    deviceId,
                    sessionDeviceInfo: { browser: { name: 'Chrome' } },
                    fingerprintData: {
                        system: { platform: 'Windows' }
                    } as never
                })
                throw new Error('Expected handler to fail')
            } catch (error) {
                expect(getApplicationError(error)?.code).toBe(code)
            }
        })
    })
})
