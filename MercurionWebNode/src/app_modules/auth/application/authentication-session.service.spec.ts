import { ApplicationErrorCode } from '@mercurion/rest-contracts'

import { getApplicationError } from 'src/exception-handling/application-error'
import { TokenType } from '../models/enums/token-type.enum'
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
    const redisService = { set: jest.fn(), eval: jest.fn() }
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
        redisService.eval.mockReset().mockResolvedValue(null)
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
        jwtTools.decodeUnsafe.mockReturnValue({
            jti: 'jti',
            exp: Math.floor(Date.now() / 1000) + 300
        })

        await expect(service.createMfaPreAuthorizationToken(
            '00000000-0000-4000-8000-000000000113',
            '00000000-0000-4000-8000-000000000114',
            '00000000-0000-4000-8000-000000000115'
        )).resolves.toBe('pre-auth')
        expect(redisService.set).toHaveBeenCalledWith(
            'mfa:pat:dev:jti',
            '00000000-0000-4000-8000-000000000115',
            expect.any(Number)
        )
        expect(redisService.eval).toHaveBeenCalledWith(
            expect.stringContaining("redis.call('SET', ARGV[3] .. previous, '1', 'EX', ttl)"),
            ['mfa:pat:active:00000000-0000-4000-8000-000000000113'],
            ['jti', 'issued:', 'revoked:', expect.any(String), 'mfa:pat:dev:', '60']
        )
    })

    it('waits for the previous token revocation before releasing a replacement', async () => {
        jwtTools.generateToken.mockResolvedValue('replacement')
        jwtTools.decodeUnsafe.mockReturnValue({
            jti: 'new-jti',
            exp: Math.floor(Date.now() / 1000) + 300
        })
        let finishRevocation: ((value: null) => void) | undefined
        redisService.eval.mockImplementation(() => new Promise<null>(resolve => {
            finishRevocation = resolve
        }))
        const result = service.createMfaPreAuthorizationToken(
            '00000000-0000-4000-8000-000000000113',
            '00000000-0000-4000-8000-000000000114',
            '00000000-0000-4000-8000-000000000115'
        )
        await new Promise(resolve => setImmediate(resolve))
        let released = false
        void result.then(() => { released = true })
        expect(released).toBe(false)
        expect(finishRevocation).toBeDefined()
        finishRevocation!(null)
        await expect(result).resolves.toBe('replacement')
    })
})
