import { Injectable } from '@nestjs/common'
import type { UUID } from 'crypto'
import { RedisService } from 'src/app_modules/redis/services/redis.service'
import type { GeoLocation } from '../services/geo-ip.service'
import type {
    ISession,
    ISSO_SessionActivationData
} from '../Models/interfaces/i-session.interface'
import type { SessionFetchOptions } from '../Models/interfaces/session-fetch-options.interface'
import type {
    PersistSessionOptions,
    SessionRepository
} from '../Models/interfaces/session-repository.interface'
import { SessionRedisCodec } from './session-redis.codec'
import {
    redisDurations,
    redisKeys
} from 'src/app_modules/redis/contracts/redis-contracts'

@Injectable()
export class RedisSessionRepository implements SessionRepository {

    private static readonly TRUST_TTL = redisDurations.days(30)

    constructor(
        private readonly redisService: RedisService,
        private readonly codec: SessionRedisCodec
    ) { }

    private sessionKey(sessionId: string, userId: string) {
        return redisKeys.session.record(sessionId, userId)
    }

    private sessionPattern(sessionId: string) {
        return redisKeys.session.recordsBySession(sessionId)
    }

    private userSessionsKey(userId: string) {
        return redisKeys.session.userIndex(userId)
    }

    private userIdFromSessionKey(key: string): string | undefined {
        const parts = key.split(':')
        return parts.length === 3 ? parts[2] : undefined
    }

    private async findSessionKey(
        sessionId: string,
        userId?: string
    ): Promise<ReturnType<typeof redisKeys.session.record> | undefined> {
        if (userId) {
            return this.sessionKey(sessionId, userId)
        }
        const [key] = await this.redisService.scanIterate(this.sessionPattern(sessionId))
        return key
    }

    private async findUserIdInSessionIndexes(sessionId: string): Promise<string | undefined> {
        const keys = await this.redisService.scanIterate(redisKeys.session.allUserIndexes())
        for (const key of keys) {
            if (await this.redisService.sismember(key, sessionId)) {
                return key.split(':')[1]
            }
        }
        return undefined
    }

    private async deleteKey(
        key: ReturnType<typeof redisKeys.session.record>
    ): Promise<void> {
        await this.redisService.unlink(key)
    }

    public async getActivatedSessionIds(userId: UUID): Promise<string[]> {
        return this.redisService.smembers(this.userSessionsKey(userId))
    }

    public async saveSession(
        session: ISession,
        options: PersistSessionOptions
    ): Promise<void> {
        const key = this.sessionKey(session.sessionId, session.userId)
        const record = this.codec.encode(session, options.longTerm)
        for (const [field, value] of Object.entries(record)) {
            await this.redisService.hset(key, field, value)
        }
        await this.redisService.setTTL(key, redisDurations.seconds(options.ttlSeconds))
        await this.redisService.sadd(this.userSessionsKey(session.userId), session.sessionId)
    }

    public async activateSession(
        sessionId: string,
        userId: string,
        activationData?: ISSO_SessionActivationData
    ): Promise<void> {
        const key = this.sessionKey(sessionId, userId)
        await this.redisService.hset(key, 'valid', 'true')
        if (!activationData) {
            return
        }

        await this.redisService.hset(key, 'IP', activationData.IP)
        await this.redisService.hset(key, 'deviceId', activationData.deviceId)
        await this.redisService.hset(key, 'fingerprint', activationData.fingerprint)
        await this.redisService.hset(key, 'location', activationData.location)
        await this.redisService.hset(
            key,
            'sessionDeviceInfo',
            JSON.stringify(activationData.sessionDeviceInfo)
        )
    }

    public async isSessionLongTerm(sessionId: UUID, userId: UUID): Promise<boolean> {
        const value = await this.redisService.hget(
            this.sessionKey(sessionId, userId),
            'longTerm'
        )
        return value === 'true'
    }

    public async findSessionsByUserId(
        userId: string,
        options?: SessionFetchOptions
    ): Promise<ISession[]> {
        const keys = await this.redisService.scanIterate(redisKeys.session.recordsByUser(userId))
        const sessions = (await Promise.all(keys.map(async key =>
            this.codec.decode(await this.redisService.hgetall(key))
        ))).filter((session): session is ISession => session !== null)

        return options?.onlyValid
            ? sessions.filter(session => session.valid)
            : sessions
    }

    public async findSessionIdsByUserId(userId: string): Promise<string[]> {
        const keys = await this.redisService.scanIterate(redisKeys.session.recordsByUser(userId))
        return keys.flatMap(key => {
            const parts = key.split(':')
            return parts.length === 3 ? [parts[1]] : []
        })
    }

    public async findSession(sessionId: string, userId?: string): Promise<ISession | null> {
        const key = await this.findSessionKey(sessionId, userId)
        if (!key) {
            return null
        }
        return this.codec.decode(await this.redisService.hgetall(key))
    }

    public async resolveSessionOwner(
        sessionId: string,
        userId?: string
    ): Promise<string | undefined> {
        if (userId) {
            return userId
        }

        const key = await this.findSessionKey(sessionId)
        if (key) {
            return this.userIdFromSessionKey(key)
        }
        return this.findUserIdInSessionIndexes(sessionId)
    }

    public async sessionExists(sessionId: string): Promise<boolean> {
        const key = await this.findSessionKey(sessionId)
        if (!key) {
            return false
        }
        const value = await this.redisService.hget(key, 'sessionId')
        return value !== null && value !== undefined
    }

    public async touchSession(
        sessionId: string,
        shortSessionTtl: number,
        userId?: string
    ): Promise<void> {
        const key = await this.findSessionKey(sessionId, userId)
        if (!key) {
            return
        }

        await this.redisService.hset(key, 'lastAccessedAt', Date.now().toString())
        const longTerm = await this.redisService.hget(key, 'longTerm')
        if (longTerm !== 'true') {
            await this.redisService.setTTL(key, redisDurations.seconds(shortSessionTtl))
        }
    }

    public async invalidateSession(sessionId: string, userId?: string): Promise<void> {
        const key = await this.findSessionKey(sessionId, userId)
        if (!key) {
            return
        }
        await this.redisService.hset(key, 'valid', 'false')
    }

    public async deleteSessionByOwner(sessionId: string, userId: string): Promise<void> {
        const key = this.sessionKey(sessionId, userId)
        await this.redisService.srem(this.userSessionsKey(userId), sessionId)
        if (await this.redisService.hget(key, 'sessionId')) {
            await this.deleteKey(key)
        }
    }

    public async clearUserSessionIndex(userId: string): Promise<void> {
        await this.redisService.del(this.userSessionsKey(userId))
    }

    private async issuedTokenTtl(jti: string, sessionId?: string): Promise<number | null> {
        let key: ReturnType<typeof redisKeys.token.issued> | undefined
        if (sessionId) {
            key = redisKeys.token.issued(sessionId, jti)
        } else {
            [key] = await this.redisService.scanIterate(redisKeys.token.issuedByJti(jti))
        }
        if (!key) {
            return null
        }

        const ttl = await this.redisService.ttl(key)
        return ttl >= 0 ? ttl : null
    }

    public async registerIssuedToken(
        sessionId: string,
        jti: string,
        ttlSeconds: number
    ): Promise<void> {
        await this.redisService.set(
            redisKeys.token.issued(sessionId, jti),
            '1',
            redisDurations.seconds(ttlSeconds)
        )
    }

    public async revokeToken(jti: string, sessionId?: string): Promise<void> {
        const ttl = await this.issuedTokenTtl(jti, sessionId)
        const expiresIn = ttl && ttl > 0
            ? ttl
            : RedisSessionRepository.TRUST_TTL
        await this.redisService.set(
            redisKeys.token.revoked(jti),
            '1',
            typeof expiresIn === 'number' ? redisDurations.seconds(expiresIn) : expiresIn
        )
    }

    public async isTokenRevoked(jti: string): Promise<boolean> {
        return this.redisService.exists(redisKeys.token.revoked(jti))
    }

    public async findIssuedJtis(sessionId: string): Promise<string[]> {
        const keys = await this.redisService.scanKeysByPattern(
            redisKeys.token.issuedBySession(sessionId)
        )
        return keys.map(key => key.split(':')[2])
    }

    public async getFingerprintWhiteList(userId: UUID): Promise<string[]> {
        const value = await this.redisService.get(
            redisKeys.trust.fingerprintWhitelist(userId)
        )
        try {
            return value === null ? [] : JSON.parse(value) as string[]
        } catch {
            return []
        }
    }

    public async trustFingerprint(userId: UUID, fingerprint: string): Promise<void> {
        await this.redisService.set(
            redisKeys.trust.fingerprint(userId, fingerprint),
            'true',
            RedisSessionRepository.TRUST_TTL
        )
    }

    public async isFingerprintTrusted(userId: UUID, fingerprint: string): Promise<boolean> {
        return await this.redisService.get(
            redisKeys.trust.fingerprint(userId, fingerprint)
        ) === 'true'
    }

    public async getTrustedLocations(userId: UUID): Promise<GeoLocation[]> {
        const value = await this.redisService.get(redisKeys.trust.location(userId))
        try {
            return value === null ? [] : JSON.parse(value) as GeoLocation[]
        } catch {
            return []
        }
    }

    public async saveTrustedLocations(
        userId: UUID,
        locations: GeoLocation[]
    ): Promise<void> {
        await this.redisService.set(
            redisKeys.trust.location(userId),
            JSON.stringify(locations),
            RedisSessionRepository.TRUST_TTL
        )
    }

    public async rememberDeviceId(deviceId: string, userId: string): Promise<void> {
        await this.redisService.sadd(redisKeys.trust.device(userId), deviceId)
    }

    public async isDeviceIdKnown(deviceId: string, userId: string): Promise<boolean> {
        return this.redisService.sismember(redisKeys.trust.device(userId), deviceId)
    }
}
