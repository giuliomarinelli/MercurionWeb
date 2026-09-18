import { ConfigService } from '@nestjs/config'
import { RedisService } from 'src/app_modules/redis/services/redis.service'
import { OAuthStateService } from './oauth-state.service'

describe('OAuthStateService', () => {
    it('creates opaque, TTL-bound records without putting raw state in the Redis key', async () => {
        const redis = { set: jest.fn().mockResolvedValue('OK') }
        const service = new OAuthStateService(
            redis as unknown as RedisService,
            { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService,
        )

        const state = await service.create({
            provider: 'google',
            purpose: 'sso-login',
            redirectTo: '/settings',
        })

        expect(state).toMatch(/^[A-Za-z0-9_-]{43}$/)
        expect(redis.set).toHaveBeenCalledWith(
            expect.stringMatching(/^oauth2:state:google:[a-f0-9]{64}$/),
            expect.any(String),
            expect.anything(),
        )
        const record = JSON.parse(redis.set.mock.calls[0][1]) as Record<string, unknown>
        expect(record).toMatchObject({
            version: 1,
            provider: 'google',
            purpose: 'sso-login',
            redirectTo: '/settings',
        })
        expect(record.expiresAt).toBeGreaterThan(record.createdAt as number)
    })

    it('consumes a state at most once when callbacks race', async () => {
        const record = JSON.stringify({
            version: 1,
            provider: 'dropbox',
            purpose: 'oauth2-connect',
            createdAt: Date.now(),
            expiresAt: Date.now() + 10_000,
            ownerUserId: 'user-1',
        })
        const getAndDelete = jest.fn()
            .mockResolvedValueOnce(record)
            .mockResolvedValueOnce(null)
        const service = new OAuthStateService(
            { getAndDelete } as unknown as RedisService,
            { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService,
        )

        const state = 'opaque-state'
        const [first, second] = await Promise.all([
            service.consume(state, 'dropbox', 'oauth2-connect'),
            service.consume(state, 'dropbox', 'oauth2-connect'),
        ])

        expect([first, second].filter(Boolean)).toHaveLength(1)
        expect(getAndDelete).toHaveBeenCalledTimes(2)
    })

    it('rejects provider, purpose and expiry mismatches after consuming the record', async () => {
        const getAndDelete = jest.fn().mockResolvedValue(JSON.stringify({
            version: 1,
            provider: 'google',
            purpose: 'sso-login',
            createdAt: Date.now() - 20_000,
            expiresAt: Date.now() - 1,
        }))
        const service = new OAuthStateService(
            { getAndDelete } as unknown as RedisService,
            { get: jest.fn().mockReturnValue('test-secret') } as unknown as ConfigService,
        )

        await expect(service.consume('state', 'dropbox', 'oauth2-connect')).resolves.toBeNull()
        expect(getAndDelete).toHaveBeenCalledTimes(1)
    })
})
