import type { UUID } from 'crypto'
import { AuthProvider } from 'src/app_modules/sso/Models/enums/auth-provider.enum'
import type { RedisService } from 'src/app_modules/redis/services/redis.service'
import type { ISession } from '../Models/interfaces/i-session.interface'
import type { SessionRepository } from '../Models/interfaces/session-repository.interface'
import { RedisSessionRepository } from './redis-session.repository'
import { SessionRedisCodec } from './session-redis.codec'
import { InMemorySessionRepository } from './testing/in-memory-session.repository'

const userId = '11111111-1111-4111-8111-111111111111' as UUID
const sessionId = '22222222-2222-4222-8222-222222222222' as UUID

function exampleSession(): ISession {
    return {
        sessionId,
        userId,
        deviceId: 'device-1',
        createdAt: 100,
        expiresAt: 200,
        lastAccessedAt: 150,
        IP: '127.0.0.1',
        valid: false,
        sessionDeviceInfo: { browser: { name: 'Chrome' } },
        fingerprint: 'fingerprint',
        location: 'local',
        provider: AuthProvider.Mercurion
    }
}

class FakeRedisService {

    private readonly strings = new Map<string, string>()
    private readonly hashes = new Map<string, Record<string, string>>()
    private readonly sets = new Map<string, Set<string>>()
    private readonly ttls = new Map<string, number>()

    private keys(): string[] {
        return [
            ...this.strings.keys(),
            ...this.hashes.keys(),
            ...this.sets.keys()
        ].filter((key, index, keys) => keys.indexOf(key) === index)
    }

    private matches(key: string, pattern: string): boolean {
        const expression = pattern
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
        return new RegExp(`^${expression}$`).test(key)
    }

    public getClient() {
        return {
            smembers: async (key: string) => [...(this.sets.get(key) ?? [])],
            ttl: async (key: string) => this.ttls.get(key) ?? -1,
            unlink: async (key: string) => this.del(key),
            del: async (key: string) => this.del(key)
        }
    }

    public async setTTL(key: string, ttl: number): Promise<void> {
        this.ttls.set(key, ttl)
    }

    public async set(key: string, value: string, ttl?: number): Promise<'OK'> {
        this.strings.set(key, value)
        if (ttl) {
            this.ttls.set(key, ttl)
        }
        return 'OK'
    }

    public async get(key: string): Promise<string | null> {
        return this.strings.get(key) ?? null
    }

    public async del(key: string): Promise<number> {
        const existed = this.strings.delete(key)
            || this.hashes.delete(key)
            || this.sets.delete(key)
        this.ttls.delete(key)
        return existed ? 1 : 0
    }

    public async exists(key: string): Promise<boolean> {
        return this.keys().includes(key)
    }

    public async scanIterate(pattern: string): Promise<string[]> {
        return this.keys().filter(key => this.matches(key, pattern))
    }

    public async hset(hash: string, field: string, value: string): Promise<number> {
        const record = this.hashes.get(hash) ?? {}
        record[field] = value
        this.hashes.set(hash, record)
        return 1
    }

    public async hget(hash: string, field: string): Promise<string | null> {
        return this.hashes.get(hash)?.[field] ?? null
    }

    public async hgetall(hash: string): Promise<Record<string, string>> {
        return { ...(this.hashes.get(hash) ?? {}) }
    }

    public async sadd(key: string, value: string): Promise<number> {
        const values = this.sets.get(key) ?? new Set<string>()
        const previousSize = values.size
        values.add(value)
        this.sets.set(key, values)
        return values.size === previousSize ? 0 : 1
    }

    public async sismember(key: string, value: string): Promise<boolean> {
        return this.sets.get(key)?.has(value) ?? false
    }

    public async srem(key: string, value: string): Promise<number> {
        const values = this.sets.get(key)
        if (!values?.delete(value)) {
            return 0
        }
        if (values.size === 0) {
            this.sets.delete(key)
        }
        return 1
    }

    public async scanKeysByPattern(pattern: string): Promise<string[]> {
        return this.scanIterate(pattern)
    }
}

function repositoryContract(
    name: string,
    createRepository: () => SessionRepository
): void {
    describe(name, () => {
        let repository: SessionRepository

        beforeEach(() => {
            repository = createRepository()
        })

        it('preserves create/read/activate/invalidate/delete and index semantics', async () => {
            await expect(repository.findSession(sessionId, userId)).resolves.toBeNull()
            await repository.saveSession(exampleSession(), {
                longTerm: true,
                ttlSeconds: 7200
            })

            await expect(repository.findSession(sessionId, userId))
                .resolves.toEqual(exampleSession())
            await expect(repository.getActivatedSessionIds(userId))
                .resolves.toEqual([sessionId])
            await expect(repository.findSessionIdsByUserId(userId))
                .resolves.toEqual([sessionId])
            await expect(repository.resolveSessionOwner(sessionId))
                .resolves.toBe(userId)
            await expect(repository.sessionExists(sessionId)).resolves.toBe(true)
            await expect(repository.isSessionLongTerm(sessionId, userId))
                .resolves.toBe(true)
            await expect(repository.findSessionsByUserId(userId, { onlyValid: true }))
                .resolves.toEqual([])

            await repository.activateSession(sessionId, userId, {
                IP: '127.0.0.2',
                deviceId: 'device-2',
                fingerprint: 'new-fingerprint',
                location: 'remote',
                sessionDeviceInfo: { browser: { name: 'Firefox' } }
            })
            await expect(repository.findSession(sessionId, userId))
                .resolves.toEqual(expect.objectContaining({
                    valid: true,
                    IP: '127.0.0.2',
                    deviceId: 'device-2',
                    fingerprint: 'new-fingerprint',
                    location: 'remote',
                    sessionDeviceInfo: { browser: { name: 'Firefox' } }
                }))

            await repository.invalidateSession(sessionId, userId)
            await expect(repository.findSession(sessionId, userId))
                .resolves.toEqual(expect.objectContaining({ valid: false }))

            await repository.deleteSessionByOwner(sessionId, userId)
            await expect(repository.findSession(sessionId, userId)).resolves.toBeNull()
            await expect(repository.getActivatedSessionIds(userId)).resolves.toEqual([])
            await expect(repository.sessionExists(sessionId)).resolves.toBe(false)
        })

        it('preserves token and trust observable semantics', async () => {
            await repository.registerIssuedToken(sessionId, 'jti', 125)
            await expect(repository.findIssuedJtis(sessionId)).resolves.toEqual(['jti'])
            await expect(repository.isTokenRevoked('jti')).resolves.toBe(false)
            await repository.revokeToken('jti', sessionId)
            await expect(repository.isTokenRevoked('jti')).resolves.toBe(true)

            await expect(repository.isFingerprintTrusted(userId, 'fingerprint'))
                .resolves.toBe(false)
            await repository.trustFingerprint(userId, 'fingerprint')
            await expect(repository.isFingerprintTrusted(userId, 'fingerprint'))
                .resolves.toBe(true)

            await repository.saveTrustedLocations(userId, [
                { latitude: 1, longitude: 2 }
            ])
            await expect(repository.getTrustedLocations(userId)).resolves.toEqual([
                { latitude: 1, longitude: 2 }
            ])

            await expect(repository.isDeviceIdKnown('device-1', userId))
                .resolves.toBe(false)
            await repository.rememberDeviceId('device-1', userId)
            await expect(repository.isDeviceIdKnown('device-1', userId))
                .resolves.toBe(true)
        })
    })
}

repositoryContract(
    'InMemorySessionRepository contract',
    () => new InMemorySessionRepository()
)
repositoryContract(
    'RedisSessionRepository contract',
    () => new RedisSessionRepository(
        new FakeRedisService() as unknown as RedisService,
        new SessionRedisCodec()
    )
)

describe('RedisSessionRepository invalid records', () => {
    it('returns null rather than leaking malformed serialized records', async () => {
        const redis = new FakeRedisService()
        await redis.hset(`session:${sessionId}:${userId}`, 'sessionId', sessionId)
        await redis.hset(`session:${sessionId}:${userId}`, 'valid', 'not-json')
        const repository = new RedisSessionRepository(
            redis as unknown as RedisService,
            new SessionRedisCodec()
        )

        await expect(repository.findSession(sessionId, userId)).resolves.toBeNull()
    })
})

describe('RedisSessionRepository TTL compatibility', () => {
    it('keeps create, short-session refresh and issued-token revocation TTLs', async () => {
        const redis = new FakeRedisService()
        const repository = new RedisSessionRepository(
            redis as unknown as RedisService,
            new SessionRedisCodec()
        )
        const key = `session:${sessionId}:${userId}`

        await repository.saveSession(exampleSession(), {
            longTerm: false,
            ttlSeconds: 3600
        })
        await expect(redis.getClient().ttl(key)).resolves.toBe(3600)

        await repository.touchSession(sessionId, 1800, userId)
        await expect(redis.getClient().ttl(key)).resolves.toBe(1800)

        await repository.registerIssuedToken(sessionId, 'jti', 125)
        await repository.revokeToken('jti', sessionId)
        await expect(redis.getClient().ttl('revoked:jti')).resolves.toBe(125)
    })
})
