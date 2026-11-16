import { LocalDummyLoginHandler } from './local-dummy-login.handler'

describe('LocalDummyLoginHandler', () => {
    it.each([
        { accepted: true, outcome: 'authenticated' },
        { accepted: false, outcome: 'not-found' }
    ])('returns the explicit local-dummy $outcome transition', async ({
        accepted,
        outcome
    }) => {
        const localDummyAuth = {
            acceptsActivationRequest: jest.fn().mockReturnValue(accepted),
            createAuthenticatedSession: jest.fn().mockResolvedValue({
                sessionId: '00000000-0000-4000-8000-000000000501',
                accessToken: 'access',
                ws_accessToken: 'ws'
            })
        }
        const handler = new LocalDummyLoginHandler(
            localDummyAuth as never,
            {
                signDeviceId: jest.fn().mockReturnValue('signed-device')
            } as never
        )
        const operation = handler.execute({
            requestHeaders: { host: 'localhost:8888' },
            deviceId: '00000000-0000-4000-8000-000000000502',
            ip: '127.0.0.1',
            sessionDeviceInfo: { browser: { name: 'Chrome' } },
            fingerprintData: {
                system: { platform: 'Windows' }
            } as never
        })

        if (outcome === 'authenticated') {
            await expect(operation).resolves.toEqual({
                outcome: 'authenticated',
                sessionId: '00000000-0000-4000-8000-000000000501',
                accessToken: 'access',
                ws_accessToken: 'ws',
                signedDeviceId: 'signed-device'
            })
        } else {
            await expect(operation).resolves.toEqual({
                outcome: 'not-found'
            })
            expect(
                localDummyAuth.createAuthenticatedSession
            ).not.toHaveBeenCalled()
        }
    })
})
