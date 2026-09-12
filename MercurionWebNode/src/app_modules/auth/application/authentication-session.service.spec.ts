import { ApplicationErrorCode } from '@mercurion/rest-contracts'

import { getApplicationError } from 'src/exception-handling/application-error'
import { TokenType } from '../Models/enums/token-type.enum'
import { AuthenticationSessionService } from './authentication-session.service'

describe('AuthenticationSessionService', () => {
    const sessionService = {
        getSession: jest.fn(),
        activateSession: jest.fn(),
        setDeviceIdAsKnown: jest.fn(),
        addFingerprintToWhiteList: jest.fn(),
        addTrustedLocation: jest.fn()
    }
    const mfaService = { isMfaEnabled: jest.fn() }
    const jwtTools = {
        generateToken: jest.fn(),
        decodeUnsafe: jest.fn()
    }
    const geoIpService = { getLocation: jest.fn() }
    const redisService = { set: jest.fn() }
    const service = new AuthenticationSessionService(
        sessionService as never,
        mfaService as never,
        jwtTools as never,
        geoIpService as never,
        redisService as never
    )

    beforeEach(() => {
        jest.clearAllMocks()
        jwtTools.generateToken.mockReset()
        jwtTools.decodeUnsafe.mockReset()
        geoIpService.getLocation.mockReturnValue({
            city: null,
            country: null,
            ip: '127.0.0.1',
            region: null,
            latitude: 0,
            longitude: 0
        })
    })

    it.each([
        { sessionExists: true, outcome: 'tokens' },
        { sessionExists: false, outcome: 'SESSION_INVALID' }
    ])('returns the explicit $outcome finalization transition', async ({
        sessionExists,
        outcome
    }) => {
        sessionService.getSession.mockResolvedValue(
            sessionExists ? { deviceId: 'device' } : null
        )
        mfaService.isMfaEnabled.mockResolvedValue(false)
        jwtTools.generateToken
            .mockResolvedValueOnce('access')
            .mockResolvedValueOnce('ws')

        const operation = service.completeAuthenticatedSession(
            '00000000-0000-4000-8000-000000000111',
            '00000000-0000-4000-8000-000000000112',
            { system: { platform: 'Windows' } } as never,
            '127.0.0.1'
        )
        if (outcome === 'tokens') {
            await expect(operation).resolves.toEqual({
                accessToken: 'access',
                ws_accessToken: 'ws'
            })
            expect(jwtTools.generateToken).toHaveBeenNthCalledWith(
                1,
                expect.any(String),
                TokenType.AccessToken,
                expect.any(String)
            )
        } else {
            try {
                await operation
                throw new Error('Expected handler to fail')
            } catch (error) {
                expect(getApplicationError(error)?.code).toBe(
                    ApplicationErrorCode.SESSION_INVALID
                )
            }
        }
    })

    it('binds an MFA pre-authorization token to the device', async () => {
        jwtTools.generateToken.mockResolvedValue('pre-auth')
        jwtTools.decodeUnsafe.mockReturnValue({ jti: 'jti' })

        await expect(service.createMfaPreAuthorizationToken(
            '00000000-0000-4000-8000-000000000113',
            '00000000-0000-4000-8000-000000000114',
            '00000000-0000-4000-8000-000000000115'
        )).resolves.toBe('pre-auth')
        expect(redisService.set).toHaveBeenCalledWith(
            'mfa:pat:dev:jti',
            '00000000-0000-4000-8000-000000000115',
            300
        )
    })
})
