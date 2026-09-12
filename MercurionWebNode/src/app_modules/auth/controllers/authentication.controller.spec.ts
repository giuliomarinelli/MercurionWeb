import { AuthenticationController } from './authentication.controller'
import {
    BadRequestException,
    NotFoundException,
    UnauthorizedException
} from '@nestjs/common'

describe('AuthenticationController', () => {
    const verifyEmail = { execute: jest.fn() }
    const credentialLogin = { execute: jest.fn() }
    const startMfaChallenge = { execute: jest.fn() }
    const completeMfaLogin = { execute: jest.fn() }
    const logoutHandler = { execute: jest.fn() }
    const revokeSession = { execute: jest.fn() }
    const revokeAllSessions = { execute: jest.fn() }
    const refreshWsAccessToken = { execute: jest.fn() }
    const completeSsoAuthentication = { execute: jest.fn() }
    const localDummyLoginHandler = { execute: jest.fn() }
    const response = {
        ok: jest.fn((message: string) => ({
            statusCode: 200,
            message,
            timestamp: 'now'
        }))
    }
    const secureCookieService = {
        setSignedCookie: jest.fn(),
        clearCookie: jest.fn()
    }
    const configService = {
        get: jest.fn((key: string) => {
            if (key === 'SecureCookie') {
                return {
                    secret: 'secret',
                    sameSite: 'lax',
                    path: '/',
                    httpOnly: true,
                    maxAge: undefined
                }
            }
            if (key === 'Session.persistentSessionLasting') {
                return 3600
            }
            return undefined
        })
    }
    let controller: AuthenticationController

    beforeEach(() => {
        jest.clearAllMocks()
        controller = new AuthenticationController(
            verifyEmail as never,
            credentialLogin as never,
            startMfaChallenge as never,
            completeMfaLogin as never,
            logoutHandler as never,
            revokeSession as never,
            revokeAllSessions as never,
            refreshWsAccessToken as never,
            completeSsoAuthentication as never,
            localDummyLoginHandler as never,
            response,
            secureCookieService as never,
            configService as never
        )
    })

    it('maps email verification to one typed handler call', async () => {
        verifyEmail.execute.mockResolvedValue({ verified: true })

        const result = await controller.login_zeroStep({
            email: 'user@example.com'
        })

        expect(verifyEmail.execute).toHaveBeenCalledWith({
            email: 'user@example.com'
        })
        expect(result).toEqual(expect.objectContaining({
            message: 'Email successfully verified'
        }))
    })

    it('preserves the unauthorized email-verification response', async () => {
        verifyEmail.execute.mockResolvedValue({ verified: false })

        await expect(controller.login_zeroStep({
            email: 'ghost@example.com'
        })).rejects.toBeInstanceOf(UnauthorizedException)
    })

    it.each([
        {
            outcome: 'invalid-token',
            expected: UnauthorizedException
        },
        {
            outcome: 'invalid-strategy',
            expected: BadRequestException
        }
    ])('maps MFA challenge $outcome to the existing HTTP class', async ({
        outcome,
        expected
    }) => {
        startMfaChallenge.execute.mockResolvedValue({ outcome })

        await expect(controller.login_secondStep(
            false,
            'pre-auth',
            'EMAIL_OTP'
        )).rejects.toBeInstanceOf(expected)
    })

    it('preserves the local-dummy not-found response', async () => {
        localDummyLoginHandler.execute.mockResolvedValue({
            outcome: 'not-found'
        })

        await expect(controller.localDummyLogin(
            { headers: {} } as never,
            '127.0.0.1',
            '00000000-0000-4000-8000-000000000009',
            { browser: { name: 'Chrome' } },
            { system: { platform: 'Windows' } } as never,
            { setCookie: jest.fn() } as never
        )).rejects.toBeInstanceOf(NotFoundException)
    })

    it.each([
        {
            next: 'mfa',
            loggedIn: 'pending_long',
            additional: { preAuthorizationToken: 'pre-auth' }
        },
        {
            next: 'authenticated',
            loggedIn: 'true',
            additional: {
                accessToken: 'access',
                ws_accessToken: 'ws'
            }
        }
    ])('maps credential $next outcome to transport cookies', async ({
        next,
        loggedIn,
        additional
    }) => {
        credentialLogin.execute.mockResolvedValue({
            next,
            sessionId: '00000000-0000-4000-8000-000000000001',
            remember: true,
            needsMfa: next === 'mfa',
            enabledMfaStrategies: next === 'mfa' ? ['EMAIL_OTP'] : [],
            suspiciousAttempt: false,
            initials: 'UE',
            signedDeviceId: 'signed-device',
            ...additional
        })
        const reply = { setCookie: jest.fn() }

        const result = await controller.login_firstStep(
            {
                email: 'user@example.com',
                password: 'secret',
                remember: true
            },
            '127.0.0.1',
            '00000000-0000-4000-8000-000000000002',
            { browser: { name: 'Chrome' } },
            { system: { platform: 'Windows' } } as never,
            reply as never
        )

        expect(credentialLogin.execute).toHaveBeenCalledTimes(1)
        expect(secureCookieService.setSignedCookie).toHaveBeenCalledTimes(1)
        expect(reply.setCookie).toHaveBeenCalledWith(
            '__logged_in',
            loggedIn,
            expect.objectContaining({ maxAge: 3600, httpOnly: false })
        )
        expect(result).toEqual(expect.objectContaining(additional))
    })

    it.each([
        { revokedCurrentSession: false, expectedClears: 0 },
        { revokedCurrentSession: true, expectedClears: 2 }
    ])('clears transport cookies only when the current session is revoked', async ({
        revokedCurrentSession,
        expectedClears
    }) => {
        revokeSession.execute.mockResolvedValue({ revokedCurrentSession })

        await controller.logoutFromSession(
            '00000000-0000-4000-8000-000000000003',
            {
                signedSessionId:
                    `00000000-0000-4000-8000-000000000004.${'a'.repeat(64)}`
            },
            '00000000-0000-4000-8000-000000000005',
            {} as never
        )

        expect(revokeSession.execute).toHaveBeenCalledTimes(1)
        expect(secureCookieService.clearCookie).toHaveBeenCalledTimes(
            expectedClears
        )
    })
})
