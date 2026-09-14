import {
    ListActiveSessionsHandler,
    LogoutHandler,
    RefreshWsAccessTokenHandler,
    RevokeAllSessionsHandler,
    RevokeSessionHandler
} from './session-authentication.handlers'
import { TokenType } from '../Models/enums/token-type.enum'

describe('session authentication handlers', () => {
    it.each([
        { destroyFails: false },
        { destroyFails: true }
    ])('keeps logout idempotent when destroyFails=$destroyFails', async ({
        destroyFails
    }) => {
        const sessionService = {
            getJtiListBySessionId: jest.fn().mockResolvedValue(['jti']),
            destroySession: destroyFails
                ? jest.fn().mockRejectedValue(new Error('already gone'))
                : jest.fn().mockResolvedValue(undefined),
            revokeToken: jest.fn()
        }
        const result = await new LogoutHandler(sessionService as never).execute({
            sessionId: '00000000-0000-4000-8000-000000000301',
            deviceId: '00000000-0000-4000-8000-000000000302'
        })
        expect(result).toEqual({ completed: true })
    })

    it.each([
        {
            target: '00000000-0000-4000-8000-000000000303',
            current: '00000000-0000-4000-8000-000000000304',
            revokedCurrentSession: false,
            rejects: false
        },
        {
            target: '00000000-0000-4000-8000-000000000304',
            current: '00000000-0000-4000-8000-000000000304',
            revokedCurrentSession: true,
            rejects: false
        },
        {
            target: '00000000-0000-4000-8000-000000000304',
            current: '00000000-0000-4000-8000-000000000304',
            revokedCurrentSession: true,
            rejects: true
        }
    ])('makes the single-session revocation outcome explicit', async ({
        target,
        current,
        revokedCurrentSession,
        rejects
    }) => {
        const failure = new Error('invalid signed session')
        const sessionService = {
            destroySessionAndRevokeAllTokensBySignedSessionId: rejects
                ? jest.fn().mockRejectedValue(failure)
                : jest.fn().mockResolvedValue(undefined)
        }
        const operation = new RevokeSessionHandler(
            sessionService as never
        ).execute({
            userId: '00000000-0000-4000-8000-000000000305',
            signedSessionId: `${target}.${'a'.repeat(64)}`,
            currentSessionId: current as never
        })
        if (rejects) {
            await expect(operation).rejects.toBe(failure)
        } else {
            await expect(operation).resolves.toEqual({ revokedCurrentSession })
        }
    })

    it.each([
        { rejects: false, outcome: 'success' },
        { rejects: true, outcome: 'failure' }
    ])('propagates the revoke-all $outcome transition', async ({
        rejects,
        outcome
    }) => {
        const failure = new Error('redis unavailable')
        const sessionService = {
            destroyAllSessionsAndRevokeAllTokensByUserId: rejects
                ? jest.fn().mockRejectedValue(failure)
                : jest.fn().mockResolvedValue(undefined)
        }
        const operation = new RevokeAllSessionsHandler(
            sessionService as never
        ).execute({
            userId: '00000000-0000-4000-8000-000000000306'
        })
        if (outcome === 'success') {
            await expect(operation).resolves.toEqual({
                revokedCurrentSession: true
            })
        } else {
            await expect(operation).rejects.toBe(failure)
        }
    })

    it.each([
        { rejects: false, outcome: 'token' },
        { rejects: true, outcome: 'failure' }
    ])('propagates the websocket refresh $outcome transition', async ({
        rejects,
        outcome
    }) => {
        const failure = new Error('signing unavailable')
        const jwtTools = {
            generateToken: rejects
                ? jest.fn().mockRejectedValue(failure)
                : jest.fn().mockResolvedValue('ws-token')
        }
        const operation = new RefreshWsAccessTokenHandler(
            jwtTools as never
        ).execute({
            userId: '00000000-0000-4000-8000-000000000307',
            sessionId: '00000000-0000-4000-8000-000000000308'
        })
        if (outcome === 'token') {
            await expect(operation).resolves.toEqual({
                wsAccessToken: 'ws-token'
            })
            expect(jwtTools.generateToken).toHaveBeenCalledWith(
                expect.any(String),
                TokenType.ws_AccessToken,
                expect.any(String)
            )
        } else {
            await expect(operation).rejects.toBe(failure)
        }
    })

    it.each([
        { rejects: false, outcome: 'sessions' },
        { rejects: true, outcome: 'failure' }
    ])('propagates the active-session query $outcome transition', async ({
        rejects,
        outcome
    }) => {
        const failure = new Error('lookup unavailable')
        const sessionService = {
            getAllActiveSessionsByUserIdAsDTOs: rejects
                ? jest.fn().mockRejectedValue(failure)
                : jest.fn().mockResolvedValue([{ current: true }])
        }
        const operation = new ListActiveSessionsHandler(
            sessionService as never
        ).execute({
            userId: '00000000-0000-4000-8000-000000000309',
            currentSessionId: '00000000-0000-4000-8000-000000000310'
        })
        if (outcome === 'sessions') {
            await expect(operation).resolves.toEqual([{ current: true }])
        } else {
            await expect(operation).rejects.toBe(failure)
        }
    })
})
