import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { randomUUID, UUID } from 'crypto';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { ISession, ISessionDeviceInfo } from '../Models/interfaces/i-session.interface';
import { nullish } from 'src/Models/nullish.type';
import { RpcException } from '@nestjs/microservices';
import { GeoLocation } from './geo-ip.service';

@Injectable()
export class SessionService {

    private readonly logger = new Logger(SessionService.name)

    constructor(private readonly redisService: RedisService) { }

    async onModuleInit() {
        this.getActiveSessionsForUser('01970782-5eba-7000-9636-9c781e5b1a5f')
    }

    private getSessionKeyOrPattern(sessionId: string, userId?: string): string {
        return `session:${sessionId}:${userId ?? '*'}`
    }

    private getUserFingerprintsWhiteListKey(userId: string): string {
        return `fingerprintsWhiteList:${userId}`
    }

    private getTrustedLocationKey(userId: string): string {
        return `trustedLocation:${userId}`
    }

    public async getActiveSessionsForUser(userId: UUID): Promise<string[]> {
        const s = await this.redisService.getClient().smembers(`user_sessions:${userId}`)
        this.logger.debug(s)
        return s
    }

    // 🔹 Creazione di una nuova sessione (semplificata con Omit<>)
    async createSession(
        sessionData: Omit<ISession, | 'sessionId' | 'expiresAt' | 'lastAccessedAt' | 'valid' | 'doNotAskMfaPhoneNumberVerification'>,
        rememberMe: boolean
    ): Promise<ISession> {
        const sessionId = randomUUID();
        const ttlSeconds = rememberMe ? 30 * 24 * 60 * 60 : 60 * 60 // 30 giorni o 60 min
        const expiresAt = Date.now() + ttlSeconds * 1000

        const session: ISession = {
            sessionId,
            ...sessionData,
            expiresAt,
            lastAccessedAt: Date.now(),
            valid: false
        };

        const sessionKey = this.getSessionKeyOrPattern(sessionId, sessionData.userId);

        await this.redisService.hset(sessionKey, 'sessionId', sessionId)
        await this.redisService.hset(sessionKey, 'userId', sessionData.userId)
        await this.redisService.hset(sessionKey, 'deviceId', sessionData.deviceId)
        await this.redisService.hset(sessionKey, 'expiresAt', expiresAt.toString())
        await this.redisService.hset(sessionKey, 'lastAccessedAt', session.lastAccessedAt.toString())
        await this.redisService.hset(sessionKey, 'IP', sessionData.IP)
        await this.redisService.hset(sessionKey, 'valid', 'false')
        await this.redisService.hset(sessionKey, 'longTerm', rememberMe.toString())
        await this.redisService.hset(sessionKey, 'sessionDeviceInfo', JSON.stringify(sessionData.sessionDeviceInfo))
        await this.redisService.hset(sessionKey, 'fingerprint', sessionData.fingerprint)
        await this.redisService.hset(sessionKey, 'location', sessionData.location)

        await this.redisService.setTTL(sessionKey, ttlSeconds)
        await this.redisService.sadd(`user_sessions:${sessionData.userId}`, sessionId)
        await this.redisService.set(
            `session_user:${sessionId}`,
            sessionData.userId,
            ttlSeconds
        )

        return session
    }


    async activateSession(sessionId: string, userId: string): Promise<void> | never {
        const session = await this.getSession(sessionId, userId)
        if (!session) throw new RpcException('UnauthorizedNoSuchSession')
        await this.redisService.hset(this.getSessionKeyOrPattern(sessionId, userId), 'valid', 'true')
    }


    // 🔹 Recupero dell'intera sessione
    async getSession(sessionId: string, userId?: string): Promise<ISession | null> {

        let key: string = ''

        try {
            key = userId ? this.getSessionKeyOrPattern(sessionId, userId) : (await this.redisService.scan(this.getSessionKeyOrPattern(sessionId))).keys[0]
        } catch {
            return null
        }


        const sessionData: Record<string, string> | nullish = await this.redisService.hgetall(key)


        if (!sessionData || Object.keys(sessionData).length === 0) {
            return null
        }

        const session: ISession = {
            sessionId: sessionData.sessionId as UUID,
            userId: sessionData.userId as UUID,
            deviceId: sessionData.deviceId as UUID,
            expiresAt: parseInt(sessionData.expiresAt, 10),
            lastAccessedAt: parseInt(sessionData.lastAccessedAt, 10),
            IP: sessionData.IP,
            valid: JSON.parse(sessionData.valid) as boolean,
            sessionDeviceInfo: JSON.parse(sessionData.sessionDeviceInfo) as ISessionDeviceInfo,
            fingerprint: sessionData.fingerprint,
            location: sessionData.location
        }

        return session

    }

    // 🔹 Validazione della sessione, deviceId e scadenza
    async validateSession(sessionId: string, deviceId: string, userId?: string): Promise<boolean> {
        const session = await this.getSession(sessionId, userId)

        if (session == null) return false

        if (!session) return false // Sessione inesistente
        if (!session.valid) return false // Sessione invalidata
        if (session.deviceId !== deviceId) return false // Device non corrisponde
        if (session.expiresAt < Date.now()) return false // 🔥 Blocco se la sessione è scaduta

        return true
    }


    // 🔹 Aggiornare lastAccessedAt ad ogni accesso
    async updateLastAccessed(sessionId: string, userId?: string): Promise<void> {
        let sessionKey = ''

        try {
            if (userId) {
                sessionKey = this.getSessionKeyOrPattern(sessionId, userId)
            } else {
                sessionKey = (await this.redisService.scan(this.getSessionKeyOrPattern(sessionId))).keys[0]
            }
        } catch (e) {
            this.logger.warn(`updateLastAccessed > Error: ${e.message || e}`)
            throw new RpcException('UnauthorizedNoSuchSession')
        }

        const now = Date.now()

        const longTermRaw = await this.redisService.hget(sessionKey, 'longTerm')
        const isLongTerm = longTermRaw === 'true'

        if (!isLongTerm) {
            const newTTL = 60 * 60; // Rinnovo TTL solo se sessione breve
            await this.redisService.setTTL(sessionKey, newTTL)
        }

        await this.redisService.hset(sessionKey, 'lastAccessedAt', now.toString())
    }

    // 🔹 Revocare una sessione (es. logout o invalidazione)
    async revokeSession(sessionId: string, userId?: string): Promise<void> {
        let sessionKey: string = ''
        try {
            if (userId) {
                sessionKey = this.getSessionKeyOrPattern(sessionId, userId)
            } else {
                sessionKey = (await this.redisService.scan(this.getSessionKeyOrPattern(sessionId))).keys[0]
            }
        } catch (e) {
            this.logger.warn(`revokeSession > Error: ${e.message || e}`)
            throw new RpcException('UnauthorizedNoSuchSession')
        }
        await this.redisService.hset(sessionKey, 'valid', 'false');
    }

    // 🔹 Revoca e blacklist di un token specifico
    async revokeToken(jti: string): Promise<void> {
        await this.redisService.sadd(`revoked:${jti}`, jti);
    }

    // 🔹 Controlla se il token è stato revocato
    async isTokenRevoked(jti: string): Promise<boolean> {
        return await this.redisService.sismember(`revoked:${jti}`, jti);
    }

    public async getJtiListBySessionId(sessionId: string): Promise<string[]> {
        const pattern = `issued:${sessionId}:*`
        const keys = await this.redisService.scanKeysByPattern(pattern)
        return keys.map(k => k.split(':')[2])
    }



    public async getFingerprintWhiteList(userId: UUID): Promise<string[]> {
        const key: string = this.getUserFingerprintsWhiteListKey(userId as string)
        const val: string | null = await this.redisService.get(key)
        let whiteList: string[]
        try {
            whiteList = val != null ? (JSON.parse(val)) as string[] : []
        } catch {
            whiteList = []
        }
        return whiteList
    }

    public async existsSession(sessionId: string): Promise<boolean> {
        const sessionKey = this.getSessionKeyOrPattern(sessionId)
        const value = await this.redisService.hget(sessionKey, 'sessionId')
        return value !== null && value !== undefined
    }

    public async destroySession(sessionId: string, deviceId: string, userId?: UUID): Promise<void> | never {
        const sessionKey = this.getSessionKeyOrPattern(sessionId)
        const exists = await this.existsSession(sessionId)
        const expectedDeviceId = await this.redisService.hget(sessionKey, 'deviceId')
        const deviceIdMatches = expectedDeviceId === deviceId
        if (exists && deviceIdMatches) {
            if (userId) {
                await this.redisService.srem(`user_sessions:${userId}`, sessionId)
            }
            await this.redisService.del(sessionKey)
            return
        }
        throw new ForbiddenException('NotAllowedAction')
    }


    public async addFingerprintToWhiteList(userId: UUID, fingerprint: string): Promise<void> {
        const key = `fingerprint:${userId}:${fingerprint}`
        await this.redisService.set(key, 'true', 30 * 24 * 60 * 60) // 30 giorni in secondi
    }

    public async isFingerprintInWhiteList(userId: UUID, fingerprint: string): Promise<boolean> {
        const key = `fingerprint:${userId}:${fingerprint}`
        const exists = await this.redisService.get(key)
        return exists === 'true'
    }



    public async addTrustedLocation(userId: UUID, location: GeoLocation): Promise<void> {

        if (location.latitude == null || location.longitude == null) {
            return
        }

        const key = this.getTrustedLocationKey(userId)

        const currentRaw = await this.redisService.get(key)
        let locations: GeoLocation[] = []

        try {
            if (currentRaw) {
                locations = JSON.parse(currentRaw) as GeoLocation[]
            }
        } catch {
            locations = []
        }

        // Evita duplicati: salva solo se non è già presente una location simile
        const alreadyPresent = locations.some(loc =>
            Math.abs(loc.latitude - location.latitude) < 0.001 &&
            Math.abs(loc.longitude - location.longitude) < 0.001
        );

        if (!alreadyPresent) {
            locations.push(location);
            await this.redisService.set(key, JSON.stringify(locations), 30 * 24 * 60 * 60)
        }
    }

    public async getTrustedLocations(userId: UUID): Promise<GeoLocation[]> {
        const key = this.getTrustedLocationKey(userId);
        const raw = await this.redisService.get(key);

        if (!raw) return []

        try {
            return JSON.parse(raw) as GeoLocation[]
        } catch {
            return []
        }
    }


}
