import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { createHmac, randomUUID, UUID } from 'crypto';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { ISession, ISessionDeviceInfo } from '../Models/interfaces/i-session.interface';
import { nullish } from 'src/Models/nullish.type';
import { RpcException } from '@nestjs/microservices';
import { GeoLocation } from './geo-ip.service';
import { SessionFetchOptions } from '../Models/interfaces/session-fetch-options.interface';
import { SessionDTO } from '../Models/DTO/session.dto';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class SessionService {

    private readonly logger = new Logger(SessionService.name)

    private readonly secret: string

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService
    ) {
        this.secret = this.configService.get<string>('App.sessionSignatureSecret')!
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

    public async getActivatedSessionsForUser(userId: UUID): Promise<string[]> {
        return this.redisService.getClient().smembers(`user_sessions:${userId}`)
    }

    private signSessionId(sessionId: UUID): string {
        const signature = createHmac('sha256', this.secret)
            .update(sessionId)
            .digest('hex')
        return `${sessionId}.${signature}`
    }

    private verifyAndParseSignedSessionId(signed: string): UUID | never {
        const e = new RpcException('InvalidSessionSignature')
        if (signed.split('.').length !== 2) {
            throw e
        }
        const [sessionId, signature] = signed.split('.')
        const expectedSignature = createHmac('sha256', this.secret)
            .update(sessionId)
            .digest('hex')
        if (signature !== expectedSignature) {
            throw e
        }
        return sessionId as UUID
    }

    private convertSessionToDTO(session: ISession, current = false, showValid = false): SessionDTO {
        return ({
            id: this.signSessionId(session.sessionId),
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            lastAccessedAt: session.lastAccessedAt,
            valid: showValid ? session.valid : undefined,
            current,
            location: session.location,
            browser: session.sessionDeviceInfo.browser.name
        })
    }

    private convertSessionListToDTOs(sessionList: ISession[], activeSessionId?: UUID): SessionDTO[] {
        return sessionList.map(s => s.sessionId === activeSessionId ? this.convertSessionToDTO(s, true) : this.convertSessionToDTO(s))
    }

    // 🔹 Creazione di una nuova sessione (semplificata con Omit<>)
    async createSession(
        sessionData: Omit<ISession, 'createdAt' | 'sessionId' | 'expiresAt' | 'lastAccessedAt' | 'valid' | 'doNotAskMfaPhoneNumberVerification'>,
        rememberMe: boolean
    ): Promise<ISession> {

        const userSessionsByDeviceId = (await this.getAllSessionsByUserId(sessionData.userId)).filter(s => s.deviceId === sessionData.deviceId)

        for (const s of userSessionsByDeviceId) {
            await this.destroySession(s.sessionId, s.deviceId, s.userId)
            await this.redisService.del(`session_user:${s.sessionId}`)
            await this.redisService.srem(`user_sessions:${s.userId}`, s.sessionId)
        }

        const sessionId = randomUUID();
        const ttlSeconds = rememberMe ? 30 * 24 * 60 * 60 : 60 * 60 // 30 giorni o 60 min
        const expiresAt = Date.now() + ttlSeconds * 1000

        const session: ISession = {
            sessionId,
            ...sessionData,
            expiresAt,
            createdAt: Date.now(),
            lastAccessedAt: Date.now(),
            valid: false
        }

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
        await this.redisService.hset(sessionKey, 'createdAt', session.createdAt.toString())

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

        if (userId) {
            key = this.getSessionKeyOrPattern(sessionId, userId)
        } else {
            const pattern = this.getSessionKeyOrPattern(sessionId)
            const [_key] = await this.redisService.scanIterate(pattern)
            key = _key
        }

        const sessionData: Record<string, string> | nullish = await this.redisService.hgetall(key)


        if (!sessionData || Object.keys(sessionData).length === 0) {
            return null
        }

        const session: ISession = {
            sessionId: sessionData.sessionId as UUID,
            userId: sessionData.userId as UUID,
            deviceId: sessionData.deviceId as UUID,
            createdAt: parseInt(sessionData.createdAt, 10),
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

    async getAllSessionsByUserId(userId: string, opts?: SessionFetchOptions): Promise<ISession[]> {

        const matchPattern = `session:*:${userId}`
        const keys = await this.redisService.scanIterate(matchPattern)

        if (keys.length === 0) {
            return []
        }

        const pipeline = this.redisService.getClient().pipeline()
        for (const key of keys) {
            pipeline.hgetall(key)
        }
        const results = await pipeline.exec()

        const sessions = results?.map(([, sessionData]) => {
            if (!sessionData || Object.keys(sessionData).length === 0) {
                return null
            }
            try {
                const sd = sessionData as Record<string, string>
                const s: ISession = {
                    sessionId: sd.sessionId as UUID,
                    userId: sd.userId as UUID,
                    deviceId: sd.deviceId as UUID,
                    createdAt: parseInt(sd.createdAt, 10),
                    expiresAt: parseInt(sd.expiresAt, 10),
                    lastAccessedAt: parseInt(sd.lastAccessedAt, 10),
                    IP: sd.IP,
                    valid: JSON.parse(sd.valid) as boolean,
                    sessionDeviceInfo: JSON.parse(sd.sessionDeviceInfo) as ISessionDeviceInfo,
                    fingerprint: sd.fingerprint,
                    location: sd.location,
                };
                return s
            } catch {
                return null
            }
        }).filter(Boolean) as ISession[]

        return opts?.onlyValid ? sessions.filter(s => s.valid) : sessions
    }

    async getAllActiveSessionsByUserIdAsDTOs(userId: string, currentSessionId: UUID): Promise<SessionDTO[]> {
        const activeSessions = await this.getAllSessionsByUserId(userId, {
            onlyValid: true
        })
        return this.convertSessionListToDTOs(activeSessions, currentSessionId)
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

        if (userId) {
            sessionKey = this.getSessionKeyOrPattern(sessionId, userId)
        } else {
            const pattern = this.getSessionKeyOrPattern(sessionId)
            sessionKey = (await this.redisService.scanIterate(pattern))[0]
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

        if (userId) {
            sessionKey = this.getSessionKeyOrPattern(sessionId, userId)
        } else {
            const pattern = this.getSessionKeyOrPattern(sessionId)
            sessionKey = (await this.redisService.scanIterate(pattern))[0]
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
        const matchPattern = this.getSessionKeyOrPattern(sessionId)
        const keys: string[] = []
        let cursor = '0'
        do {
            const scanned = await this.redisService.scan(matchPattern, cursor, 1000)
            if (scanned.keys?.length) {
                keys.push(...scanned.keys)
            }
            cursor = scanned.cursor;
        } while (cursor !== '0')
        const [sessionKey] = keys
        const value = await this.redisService.hget(sessionKey, 'sessionId')
        return value !== null && value !== undefined
    }

    public async destroySession(sessionId: string, deviceId: string, userId?: UUID): Promise<void> | never {
        let sessionKey: string
        if (userId) {
            sessionKey = this.getSessionKeyOrPattern(sessionId, userId)
        } else {
            const pattern = this.getSessionKeyOrPattern(sessionId)
            sessionKey = (await this.redisService.scanIterate(pattern))[0]
        }
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

    public async destroyAllSessionsAndRevokeAllTokensByUserId(userId: string): Promise<void> {
        const pattern = `session:*:${userId}`
        const keys = await this.redisService.scanIterate(pattern)
        const pipeline = this.redisService.getClient().pipeline()
        for (const key of keys) {
            if (key.split(':').length !== 3) {
                continue
            }
            const [, sessionId] = key.split(':')
            const jtiList = await this.getJtiListBySessionId(sessionId)
            for (const jti of jtiList) {
                pipeline.sadd(`revoked:${jti}`, jti)
            }
            pipeline.del(key)
        }
        await pipeline.exec()
    }

    public async destroySessionAndRevokeAllTokensBySignedSessionId(signedSessionId: string, userId?: string): Promise<void> | never {
        const sessionId = this.verifyAndParseSignedSessionId(signedSessionId)
        let key: string
        if (userId) {
            key = this.getSessionKeyOrPattern(sessionId, userId)
        } else {
            const pattern = this.getSessionKeyOrPattern(sessionId)
            key = (await this.redisService.scanIterate(pattern))[0]
        }
        if (!key || key.split(':').length !== 3) {
            throw new RpcException('InvalidSession')
        }
        const jtiList = await this.getJtiListBySessionId(sessionId)
        const pipeline = this.redisService.getClient().pipeline()
        for (const jti of jtiList) {
            pipeline.sadd(`revoked:${jti}`, jti)
        }
        pipeline.del(key)
        await pipeline.exec()
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

    public async setDeviceIdAsKnown(deviceId: string, userId: string): Promise<void> {
        await this.redisService.sadd(`knownDeviceId:${userId}`, deviceId)
    }

    public async isKnownDeviceId(deviceId: string, userId: string): Promise<boolean> {
        return this.redisService.sismember(`knownDeviceId:${userId}`, deviceId)
    }


}
