import { Injectable } from '@nestjs/common'
import type { UUID } from 'crypto'
import { RedisService } from 'src/app_modules/redis/services/redis.service'
import type { GeoLocation } from '../services/geo-ip.service'
import type {
    ISession,
    ISSO_SessionActivationData
} from '../models/interfaces/i-session.interface'
import type { SessionFetchOptions } from '../models/interfaces/session-fetch-options.interface'
import type {
    PersistSessionOptions,
    SessionRepository
} from '../models/interfaces/session-repository.interface'
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

    private sessionKey(sessionId: string) {
        return redisKeys.session.record(sessionId)
    }

    private userSessionsKey(userId: string) {
        return redisKeys.session.userIndex(userId)
    }

    private async findSessionOwner(sessionId: string): Promise<string | undefined> {
        const owner = await this.redisService.get(redisKeys.session.owner(sessionId))
        return owner ?? undefined
    }

    public async getActivatedSessionIds(userId: UUID): Promise<string[]> {
        return this.redisService.smembers(this.userSessionsKey(userId))
    }

    public async saveSession(
        session: ISession,
        options: PersistSessionOptions
    ): Promise<void> {
        const record = this.codec.encode(session, options.longTerm)
        const fields = Object.entries(record).flat()
        const script = `
            local previous = redis.call('GET', KEYS[4])
            if previous and previous ~= ARGV[1] then
                local previousOwner = redis.call('GET', 'session_owner:' .. previous)
                if previousOwner then
                    redis.call('SREM', 'user_sessions:' .. previousOwner, previous)
                end
                redis.call('DEL', 'session:' .. previous, 'session_owner:' .. previous,
                    'session_tokens:' .. previous)
            end
            redis.call('HSET', KEYS[1], unpack(ARGV, 4, 3 + (2 * tonumber(ARGV[3]))))
            redis.call('EXPIRE', KEYS[1], ARGV[2])
            redis.call('SET', KEYS[2], ARGV[4], 'EX', ARGV[2])
            redis.call('SADD', KEYS[3], ARGV[1])
            redis.call('EXPIRE', KEYS[3], ARGV[2])
            redis.call('SET', KEYS[4], ARGV[1], 'EX', ARGV[2])
            return 1
        `
        const args = [
            session.sessionId,
            String(options.ttlSeconds),
            String(fields.length / 2),
            session.userId,
            ...fields
        ]
        if (typeof this.redisService.eval === 'function') {
            await this.redisService.eval(script, [
                this.sessionKey(session.sessionId),
                redisKeys.session.owner(session.sessionId),
                this.userSessionsKey(session.userId),
                redisKeys.session.deviceIndex(session.userId, session.deviceId)
            ], args)
            return
        }
        for (const [field, value] of Object.entries(record)) {
            await this.redisService.hset(this.sessionKey(session.sessionId), field, value)
        }
        await this.redisService.setTTL(
            this.sessionKey(session.sessionId),
            redisDurations.seconds(options.ttlSeconds)
        )
        await this.redisService.set(
            redisKeys.session.owner(session.sessionId),
            session.userId,
            redisDurations.seconds(options.ttlSeconds)
        )
        await this.redisService.sadd(this.userSessionsKey(session.userId), session.sessionId)
        await this.redisService.set(
            redisKeys.session.deviceIndex(session.userId, session.deviceId),
            session.sessionId,
            redisDurations.seconds(options.ttlSeconds)
        )
    }

    public async activateSession(
        sessionId: string,
        userId: string,
        activationData?: ISSO_SessionActivationData
    ): Promise<void> {
        const key = this.sessionKey(sessionId)
        const fields = activationData
            ? [
                'valid', 'true',
                'IP', activationData.IP,
                'deviceId', activationData.deviceId,
                'fingerprint', activationData.fingerprint,
                'location', activationData.location,
                'sessionDeviceInfo', JSON.stringify(activationData.sessionDeviceInfo)
            ]
            : ['valid', 'true']
        const script = `
            if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
            redis.call('HSET', KEYS[1], unpack(ARGV))
            return 1
        `
        if (typeof this.redisService.eval === 'function') {
            await this.redisService.eval(script, [key], fields)
        } else {
            for (let index = 0; index < fields.length; index += 2) {
                await this.redisService.hset(key, fields[index], fields[index + 1])
            }
        }
    }

    public async isSessionLongTerm(sessionId: UUID, userId: UUID): Promise<boolean> {
        void userId
        const value = await this.redisService.hget(
            this.sessionKey(sessionId),
            'longTerm'
        )
        return value === 'true'
    }

    public async findSessionsByUserId(
        userId: string,
        options?: SessionFetchOptions
    ): Promise<ISession[]> {
        const sessionIds = await this.redisService.smembers(this.userSessionsKey(userId))
        const sessions = (await Promise.all(sessionIds.map(async sessionId =>
            this.codec.decode(await this.redisService.hgetall(this.sessionKey(sessionId))
        )))).filter((session): session is ISession => session !== null)

        return options?.onlyValid
            ? sessions.filter(session => session.valid)
            : sessions
    }

    public async findSessionIdsByUserId(userId: string): Promise<string[]> {
        return this.redisService.smembers(this.userSessionsKey(userId))
    }

    public async findSession(sessionId: string, userId?: string): Promise<ISession | null> {
        const owner = userId ?? await this.findSessionOwner(sessionId)
        if (!owner) {
            return null
        }
        return this.codec.decode(await this.redisService.hgetall(this.sessionKey(sessionId)))
    }

    public async resolveSessionOwner(
        sessionId: string,
        userId?: string
    ): Promise<string | undefined> {
        if (userId) {
            return userId
        }

        return this.findSessionOwner(sessionId)
    }

    public async sessionExists(sessionId: string): Promise<boolean> {
        const value = await this.redisService.hget(this.sessionKey(sessionId), 'sessionId')
        return value !== null && value !== undefined
    }

    public async touchSession(
        sessionId: string,
        shortSessionTtl: number,
        userId?: string
    ): Promise<void> {
        const owner = userId ?? await this.findSessionOwner(sessionId)
        if (!owner) {
            return
        }
        const key = this.sessionKey(sessionId)
        const script = `
            if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
            redis.call('HSET', KEYS[1], 'lastAccessedAt', ARGV[1])
            if redis.call('HGET', KEYS[1], 'longTerm') ~= 'true' then
                redis.call('EXPIRE', KEYS[1], ARGV[2])
                redis.call('EXPIRE', KEYS[2], ARGV[2])
                redis.call('EXPIRE', KEYS[3], ARGV[2])
            end
            return 1
        `
        if (typeof this.redisService.eval === 'function') {
            await this.redisService.eval(script, [
                key,
                redisKeys.session.owner(sessionId),
                this.userSessionsKey(owner)
            ], [Date.now().toString(), String(shortSessionTtl)])
        } else {
            await this.redisService.hset(key, 'lastAccessedAt', Date.now().toString())
            if (await this.redisService.hget(key, 'longTerm') !== 'true') {
                await this.redisService.setTTL(key, redisDurations.seconds(shortSessionTtl))
            }
        }
    }

    public async invalidateSession(sessionId: string, userId?: string): Promise<void> {
        void userId
        const script = `
            if redis.call('EXISTS', KEYS[1]) == 0 then return 0 end
            redis.call('HSET', KEYS[1], 'valid', 'false')
            return 1
        `
        if (typeof this.redisService.eval === 'function') {
            await this.redisService.eval(script, [this.sessionKey(sessionId)], [])
        } else {
            await this.redisService.hset(this.sessionKey(sessionId), 'valid', 'false')
        }
    }

    public async deleteSessionByOwner(sessionId: string, userId: string): Promise<void> {
        const script = `
            local device = redis.call('HGET', KEYS[1], 'deviceId')
            redis.call('SREM', KEYS[2], ARGV[1])
            redis.call('DEL', KEYS[1], KEYS[3], KEYS[4])
            if device then redis.call('DEL', 'session_device:' .. ARGV[2] .. ':' .. device) end
            return 1
        `
        if (typeof this.redisService.eval === 'function') {
            await this.redisService.eval(script, [
                this.sessionKey(sessionId),
                this.userSessionsKey(userId),
                redisKeys.session.owner(sessionId),
                redisKeys.session.tokenIndex(sessionId)
            ], [sessionId, userId])
        } else {
            await this.redisService.srem(this.userSessionsKey(userId), sessionId)
            await this.redisService.unlink(this.sessionKey(sessionId))
        }
    }

    public async clearUserSessionIndex(userId: string): Promise<void> {
        await this.redisService.del(this.userSessionsKey(userId))
    }

    private async issuedTokenTtl(jti: string, sessionId?: string): Promise<number | null> {
        void sessionId
        const key = redisKeys.token.issuedByJti(jti)
        const ttl = await this.redisService.ttl(key)
        return ttl >= 0 ? ttl : null
    }

    public async registerIssuedToken(
        sessionId: string,
        jti: string,
        ttlSeconds: number
    ): Promise<void> {
        const script = `
            redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[2])
            redis.call('SADD', KEYS[2], ARGV[3])
            redis.call('EXPIRE', KEYS[2], ARGV[2])
            return 1
        `
        if (typeof this.redisService.eval === 'function') {
            await this.redisService.eval(script, [
                redisKeys.token.issuedByJti(jti),
                redisKeys.session.tokenIndex(sessionId)
            ], ['1', String(ttlSeconds), jti])
        } else {
            await this.redisService.set(
                redisKeys.token.issuedByJti(jti),
                '1',
                redisDurations.seconds(ttlSeconds)
            )
            await this.redisService.sadd(redisKeys.session.tokenIndex(sessionId), jti)
        }
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
        return this.redisService.smembers(redisKeys.session.tokenIndex(sessionId))
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
