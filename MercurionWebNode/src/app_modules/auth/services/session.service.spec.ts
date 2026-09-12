import { ConfigService } from '@nestjs/config'
import type { UUID } from 'crypto'
import { AuthProvider } from 'src/app_modules/sso/Models/enums/auth-provider.enum'
import type { ISession } from '../Models/interfaces/i-session.interface'
import { InMemorySessionRepository } from '../repositories/testing/in-memory-session.repository'
import { SessionIdentityService } from './session-identity.service'
import { SessionService } from './session.service'

const userId = '11111111-1111-4111-8111-111111111111' as UUID
const sessionId = '22222222-2222-4222-8222-222222222222' as UUID

function config(): ConfigService {
    return {
        get: jest.fn((key: string) => {
            if (key === 'App.sessionSignatureSecret') return 'secret'
            if (key === 'Session.shortSessionLasting') return 3600
            if (key === 'Session.persistentSessionLasting') return 7200
            return undefined
        })
    } as unknown as ConfigService
}

function session(overrides: Partial<ISession> = {}): ISession {
    return {
        sessionId,
        userId,
        deviceId: 'device-1',
        createdAt: 100,
        expiresAt: Date.now() + 60_000,
        lastAccessedAt: 100,
        IP: '127.0.0.1',
        valid: true,
        sessionDeviceInfo: { browser: { name: 'Chrome' } },
        fingerprint: 'fingerprint',
        location: 'local',
        provider: AuthProvider.Mercurion,
        ...overrides
    }
}

describe('SessionService domain policy', () => {
    let repository: InMemorySessionRepository
    let identity: SessionIdentityService
    let service: SessionService

    beforeEach(() => {
        repository = new InMemorySessionRepository()
        identity = new SessionIdentityService(config())
        service = new SessionService(repository, identity, config())
    })

    it('validates compatible active sessions and rejects missing or mismatched sessions', async () => {
        await repository.saveSession(session(), { longTerm: false, ttlSeconds: 3600 })

        await expect(service.validateSession(sessionId, 'device-1', userId))
            .resolves.toBe(true)
        await expect(service.validateSession(sessionId, 'other-device', userId))
            .resolves.toBe(false)
        await expect(service.validateSession(
            '33333333-3333-4333-8333-333333333333',
            'device-1',
            userId
        )).resolves.toBe(false)
    })

    it('replaces an existing session for the same user device when creating', async () => {
        await repository.saveSession(session(), { longTerm: false, ttlSeconds: 3600 })

        const created = await service.createSession({
            userId,
            deviceId: 'device-1',
            IP: '127.0.0.2',
            sessionDeviceInfo: { browser: { name: 'Firefox' } },
            fingerprint: 'new-fingerprint',
            location: 'remote',
            provider: AuthProvider.Mercurion
        }, true)

        expect(created.sessionId).not.toBe(sessionId)
        await expect(repository.findSession(sessionId, userId)).resolves.toBeNull()
        await expect(repository.findSession(created.sessionId, userId))
            .resolves.toEqual(created)
        await expect(repository.isSessionLongTerm(created.sessionId, userId))
            .resolves.toBe(true)
    })

    it('rejects invalid signed session ids before repository mutation', async () => {
        const deleteSpy = jest.spyOn(repository, 'deleteSessionByOwner')

        await expect(
            service.destroySessionAndRevokeAllTokensBySignedSessionId('invalid')
        ).rejects.toThrow('InvalidSessionSignature')
        expect(deleteSpy).not.toHaveBeenCalled()
    })

    it('keeps trust decisions in the domain service and avoids near-duplicate locations', async () => {
        const saveSpy = jest.spyOn(repository, 'saveTrustedLocations')

        await service.addTrustedLocation(userId, { latitude: 1, longitude: 2 })
        await service.addTrustedLocation(userId, {
            latitude: 1.0005,
            longitude: 2.0005
        })

        expect(saveSpy).toHaveBeenCalledTimes(1)
        await expect(service.getTrustedLocations(userId)).resolves.toEqual([
            { latitude: 1, longitude: 2 }
        ])
    })

    it('propagates repository failures instead of claiming a successful mutation', async () => {
        jest.spyOn(repository, 'invalidateSession')
            .mockRejectedValueOnce(new Error('repository unavailable'))

        await expect(service.revokeSession(sessionId, userId))
            .rejects.toThrow('repository unavailable')
    })
})
