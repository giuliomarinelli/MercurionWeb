import { AuthProvider } from 'src/app_modules/sso/Models/enums/auth-provider.enum'
import { TokenType } from '../Models/enums/token-type.enum'
import { CompleteSsoAuthenticationHandler } from './sso-authentication.handler'

describe('CompleteSsoAuthenticationHandler', () => {
    const userId = '00000000-0000-4000-8000-000000000401'
    const sessionId = '00000000-0000-4000-8000-000000000402'
    const deviceId = '00000000-0000-4000-8000-000000000403'
    const jwtTools = {
        verifyTokenAndGetPayload: jest.fn(),
        generateToken: jest.fn()
    }
    const sessionService = {
        revokeToken: jest.fn(),
        createSession: jest.fn(),
        activateSession: jest.fn()
    }
    const userService = {
        existsUserById: jest.fn(),
        getUserInitialsByUserId: jest.fn()
    }
    const geoIpService = { getLocation: jest.fn() }
    const securityService = { signDeviceId: jest.fn() }
    const authenticationSession = { generateFingerprint: jest.fn() }

    beforeEach(() => {
        jest.clearAllMocks()
        jwtTools.verifyTokenAndGetPayload.mockResolvedValue({
            sub: userId,
            jti: '00000000-0000-4000-8000-000000000404'
        })
        jwtTools.generateToken
            .mockResolvedValueOnce('access')
            .mockResolvedValueOnce('ws')
        sessionService.createSession.mockResolvedValue({ sessionId })
        userService.existsUserById.mockResolvedValue(true)
        userService.getUserInitialsByUserId.mockResolvedValue('SS')
        geoIpService.getLocation.mockReturnValue({
            city: 'Rome',
            region: 'Lazio',
            country: 'Italy',
            ip: '127.0.0.1',
            latitude: 0,
            longitude: 0
        })
        securityService.signDeviceId.mockReturnValue('signed-device')
        authenticationSession.generateFingerprint.mockReturnValue('fingerprint')
    })

    const createHandler = () => new CompleteSsoAuthenticationHandler(
        jwtTools as never,
        sessionService as never,
        userService as never,
        geoIpService as never,
        securityService as never,
        authenticationSession as never
    )

    it.each([
        { provider: AuthProvider.Google, outcome: 'authenticated' },
        { provider: AuthProvider.Mercurion, outcome: 'unauthorized' },
        { provider: 'unknown', outcome: 'unauthorized' }
    ])('returns the explicit SSO $outcome transition for $provider', async ({
        provider,
        outcome
    }) => {
        const operation = createHandler().execute({
            ssoPreAuthorizationToken: 'sso-pre-auth',
            ip: '127.0.0.1',
            deviceId,
            sessionDeviceInfo: { browser: { name: 'Chrome' } },
            fingerprintData: {
                system: { platform: 'Windows' }
            } as never,
            provider
        })
        if (outcome === 'authenticated') {
            await expect(operation).resolves.toEqual({
                outcome: 'authenticated',
                provider: AuthProvider.Google,
                sessionId,
                accessToken: 'access',
                ws_accessToken: 'ws',
                initials: 'SS',
                signedDeviceId: 'signed-device'
            })
            expect(jwtTools.generateToken).toHaveBeenNthCalledWith(
                1,
                userId,
                TokenType.AccessToken,
                sessionId
            )
        } else {
            await expect(operation).resolves.toEqual({
                outcome: 'invalid-provider'
            })
        }
    })

    it('preserves unauthorized classification when SSO completion fails', async () => {
        userService.existsUserById.mockResolvedValue(false)

        await expect(createHandler().execute({
            ssoPreAuthorizationToken: 'sso-pre-auth',
            ip: '127.0.0.1',
            deviceId,
            sessionDeviceInfo: { browser: { name: 'Chrome' } },
            fingerprintData: {
                system: { platform: 'Windows' }
            } as never,
            provider: AuthProvider.Google
        })).resolves.toEqual({ outcome: 'unauthorized' })
    })
})
