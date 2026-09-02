import { ForbiddenException, Injectable } from '@nestjs/common';
import { createHmac, randomUUID, UUID } from 'crypto';
import { ISession, ISessionDeviceInfo, ISSO_SessionActivationData } from '../Models/interfaces/i-session.interface';
import { RpcException } from '@nestjs/microservices';
import { GeoLocation } from './geo-ip.service';
import { SessionFetchOptions } from '../Models/interfaces/session-fetch-options.interface';
import { SessionDTO } from '../Models/DTO/session.dto';
import { ConfigService } from '@nestjs/config';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { AuthProvider } from 'src/app_modules/sso/Models/enums/auth-provider.enum';
import { TypeGuards } from 'src/utils/type-guards/type-guards';
import { RedisService } from 'src/app_modules/redis/services/redis.service'

@Injectable()
export class SessionService {

    private readonly logger: MeiliContextLogger

    private readonly secret: string

    private readonly SHORT_SESSION_TTL: number
    private readonly LONG_SESSION_TTL: number

    constructor(
        private readonly redisService: RedisService,
        private readonly configService: ConfigService,
        meiliLogger: MeiliLoggerService
    ) {
        this.logger = meiliLogger.forContext(SessionService.name)
        this.secret = this.configService.get<string>('App.sessionSignatureSecret')!
        this.SHORT_SESSION_TTL = this.configService.get<number>('Session.shortSessionLasting')!
        this.LONG_SESSION_TTL = this.configService.get<number>('Session.persistentSessionLasting')!
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

    private getUserIdFromSessionKey(key: string): string | undefined {
        const parts = key.split(':')
        return parts.length === 3 ? parts[2] : undefined
    }

    private async findUserIdInUserSets(sessionId: string): Promise<string | undefined> {
        const keys = await this.redisService.scanIterate('user_sessions:*')
        for (const key of keys) {
            if (await this.redisService.sismember(key, sessionId)) {
                const [, userId] = key.split(':')
                return userId
            }
        }
        return undefined
    }

    private async resolveSessionContext(sessionId: string, userId?: string): Promise<{ key?: string; userId?: string }> {
        if (userId) {
            return {
                key: this.getSessionKeyOrPattern(sessionId, userId),
                userId,
            }
        }

        const [matchedKey] = await this.redisService.scanIterate(this.getSessionKeyOrPattern(sessionId))
        if (matchedKey) {
            return {
                key: matchedKey,
                userId: this.getUserIdFromSessionKey(matchedKey),
            }
        }

        const resolvedUserId = await this.findUserIdInUserSets(sessionId)
        if (resolvedUserId) {
            return {
                key: this.getSessionKeyOrPattern(sessionId, resolvedUserId),
                userId: resolvedUserId,
            }
        }

        return {}
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

    private convertSessionToDTO(session: ISession, current = false, showValid = true): SessionDTO {
        return ({
            id: this.signSessionId(session.sessionId),
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            lastAccessedAt: session.lastAccessedAt,
            valid: showValid ? session.valid : undefined,
            current,
            location: session.location,
            browser: session.sessionDeviceInfo.browser.name,
            provider: session.provider
        })
    }

    private convertSessionListToDTOs(sessionList: ISession[], activeSessionId?: UUID): SessionDTO[] {
        return sessionList.map(s => s.sessionId === activeSessionId ? this.convertSessionToDTO(s, true) : this.convertSessionToDTO(s))
    }

    private async ttlOfIssuedJti(jti: string, sessionId?: string): Promise<number | null> {
        const client = this.redisService.getClient();
        if (sessionId) {
            const k = `issued:${sessionId}:${jti}`
            const ttl = await client.ttl(k)
            return ttl >= 0 ? ttl : null
        }
        // fallback: scan veloce una sola chiave
        const [k] = await this.redisService.scanIterate(`issued:*:${jti}`)
        if (!k) return null
        const ttl = await client.ttl(k)
        return ttl >= 0 ? ttl : null
    }

    private async setRevokedJti(jti: string, sessionId?: string): Promise<void> {
        const ttl = await this.ttlOfIssuedJti(jti, sessionId)
        const ex = ttl && ttl > 0 ? ttl : 30 * 24 * 3600;
        await this.redisService.set(`revoked:${jti}`, '1', ex)
    }

    public async revokeManyJtis(jtis: string[], sessionId?: string): Promise<void> {
        if (!jtis.length) {
            return
        }
        await Promise.all(jtis.map(jti => this.setRevokedJti(jti, sessionId)))
    }

    // 🔹 Creazione di una nuova sessione (semplificata con Omit<>)
    public async createSession(
        sessionData: Omit<ISession, 'createdAt' | 'sessionId' | 'expiresAt' | 'lastAccessedAt' | 'valid'>,
        rememberMe: boolean
    ): Promise<ISession> {

        const userSessionsByDeviceId = (await this.getAllSessionsByUserId(sessionData.userId)).filter(s => s.deviceId === sessionData.deviceId)

        for (const s of userSessionsByDeviceId) {
            await this.destroySession(s.sessionId, s.deviceId, s.userId)
            await this.redisService.srem(`user_sessions:${s.userId}`, s.sessionId)
        }

        const sessionId = randomUUID()
        const ttlSeconds = rememberMe ? this.LONG_SESSION_TTL : this.SHORT_SESSION_TTL
        const expiresAt = Date.now() + this.LONG_SESSION_TTL * 1000

        const session: ISession = {
            sessionId,
            ...sessionData,
            expiresAt,
            createdAt: Date.now(),
            lastAccessedAt: Date.now(),
            valid: false,
            provider: sessionData.provider
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
        await this.redisService.hset(sessionKey, 'provider', session.provider.toString())

        await this.redisService.setTTL(sessionKey, ttlSeconds)
        await this.redisService.sadd(`user_sessions:${sessionData.userId}`, sessionId)

        return session
    }


    public async activateSession(sessionId: string, userId: string, sso_data?: ISSO_SessionActivationData): Promise<void> | never {
        const session = await this.getSession(sessionId, userId)
        if (!session) {
            throw new RpcException('UnauthorizedNoSuchSession')
        }
        const key = this.getSessionKeyOrPattern(sessionId, userId)
        await this.redisService.hset(key, 'valid', 'true')
        if (sso_data) {
            const { IP, deviceId, fingerprint, location, sessionDeviceInfo } = sso_data
            await this.redisService.hset(key, 'IP', IP)
            await this.redisService.hset(key, 'deviceId', deviceId)
            await this.redisService.hset(key, 'fingerprint', fingerprint)
            await this.redisService.hset(key, 'location', location)
            await this.redisService.hset(key, 'sessionDeviceInfo', JSON.stringify(sessionDeviceInfo))
        }
    }

    public async isSessionLongTerm(sessionId: UUID, userId: UUID): Promise<boolean> {
        const key = this.getSessionKeyOrPattern(sessionId, userId)
        const longTermRaw = await this.redisService.hget(key, 'longTerm')
        return longTermRaw === 'true'
    }

    public async getAllSessionsByUserId(userId: string, opts?: SessionFetchOptions): Promise<ISession[]> {

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
                    deviceId: sd.deviceId,
                    createdAt: parseInt(sd.createdAt, 10),
                    expiresAt: parseInt(sd.expiresAt, 10),
                    lastAccessedAt: parseInt(sd.lastAccessedAt, 10),
                    IP: sd.IP,
                    valid: JSON.parse(sd.valid) as boolean,
                    sessionDeviceInfo: JSON.parse(sd.sessionDeviceInfo) as ISessionDeviceInfo,
                    fingerprint: sd.fingerprint,
                    location: sd.location,
                    provider: TypeGuards.isAuthProvider(sd.provider) ? sd.provider : AuthProvider.Mercurion
                }
                return s
            } catch {
                return null
            }
        }).filter(Boolean) as ISession[]

        return opts?.onlyValid ? sessions.filter(s => s.valid) : sessions
    }

    public async getAllActiveSessionsByUserIdAsDTOs(userId: string, currentSessionId: UUID): Promise<SessionDTO[]> {
        const activeSessions = await this.getAllSessionsByUserId(userId, {
            onlyValid: true
        })
        return this.convertSessionListToDTOs(activeSessions, currentSessionId)
    }

    // 🔹 Validazione della sessione, deviceId e scadenza
    public async validateSession(sessionId: string, deviceId: string, userId?: string): Promise<boolean> {

        const session = await this.getSession(sessionId, userId)

        if (session == null) return false

        if (!session) return false // Sessione inesistente
        if (!session.valid) return false // Sessione invalidata
        if (session.deviceId !== deviceId) return false // Device non corrisponde
        if (session.expiresAt < Date.now()) return false // 🔥 Blocco se la sessione è scaduta

        return true
    }

    public async existsSession(sessionId: string): Promise<boolean> {
        const [key] = await this.redisService.scanIterate(this.getSessionKeyOrPattern(sessionId))
        if (!key) return false

        const value = await this.redisService.hget(key, 'sessionId')
        return value !== null && value !== undefined
    }

    public async getSession(sessionId: string, userId?: string): Promise<ISession | null> {

        let key: string

        if (userId) {
            key = this.getSessionKeyOrPattern(sessionId, userId)
        } else {
            const [k] = await this.redisService.scanIterate(this.getSessionKeyOrPattern(sessionId))
            if (!k) {
                return null
            }
            key = k
        }

        const sessionData: Record<string, string> | null = await this.redisService.hgetall(key)
        if (!sessionData || Object.keys(sessionData).length === 0) {
            return null
        }

        try {
            const session: ISession = {
                sessionId: sessionData.sessionId as UUID,
                userId: sessionData.userId as UUID,
                deviceId: sessionData.deviceId,
                createdAt: parseInt(sessionData.createdAt, 10),
                expiresAt: parseInt(sessionData.expiresAt, 10),
                lastAccessedAt: parseInt(sessionData.lastAccessedAt, 10),
                IP: sessionData.IP,
                valid: JSON.parse(sessionData.valid) as boolean,
                sessionDeviceInfo: JSON.parse(sessionData.sessionDeviceInfo) as ISessionDeviceInfo,
                fingerprint: sessionData.fingerprint,
                location: sessionData.location,
                provider: TypeGuards.isAuthProvider(sessionData.provider) ? sessionData.provider : AuthProvider.Mercurion
            }
            return session
        } catch {
            return null
        }
    }

    public async updateLastAccessed(sessionId: string, userId?: string): Promise<void> {

        let sessionKey: string

        if (userId) {
            sessionKey = this.getSessionKeyOrPattern(sessionId, userId)
        } else {
            const [k] = await this.redisService.scanIterate(this.getSessionKeyOrPattern(sessionId))
            if (!k) return
            sessionKey = k
        }

        const now = Date.now()
        await this.redisService.hset(sessionKey, 'lastAccessedAt', now.toString())

        const longTermRaw = await this.redisService.hget(sessionKey, 'longTerm')
        const isLongTerm = longTermRaw === 'true'

        // rinnova TTL solo per sessioni brevi
        if (!isLongTerm) {
            await this.redisService.setTTL(sessionKey, this.SHORT_SESSION_TTL)
        }
    }


    // 🔹 Revocare una sessione (es. logout o invalidazione)
    public async revokeSession(sessionId: string, userId?: string): Promise<void> {
        let sessionKey: string = ''

        if (userId) {
            sessionKey = this.getSessionKeyOrPattern(sessionId, userId)
        } else {
            const pattern = this.getSessionKeyOrPattern(sessionId)
            sessionKey = (await this.redisService.scanIterate(pattern))[0]
        }

        await this.redisService.hset(sessionKey, 'valid', 'false')
    }

    // 🔹 Revoca e blacklist di un token specifico
    async revokeToken(jti: string, sessionId?: string): Promise<void> {
        await this.setRevokedJti(jti, sessionId)
    }

    public async isTokenRevoked(jti: string): Promise<boolean> {
        return !!(await this.redisService.exists(`revoked:${jti}`))
    }

    public async revokeAllTokensBySessionId(sessionId: string): Promise<void> {
        const jtis = await this.getJtiListBySessionId(sessionId)
        if (!jtis.length) {
            return
        }
        await this.revokeManyJtis(jtis, sessionId)
    }

    public async getJtiListBySessionId(sessionId: string): Promise<string[]> {
        const pattern = `issued:${sessionId}:*`
        const keys = await this.redisService.scanKeysByPattern(pattern)
        return keys.map(k => k.split(':')[2])
    }

    public async getFingerprintWhiteList(userId: UUID): Promise<string[]> {
        const key: string = this.getUserFingerprintsWhiteListKey(userId)
        const val: string | null = await this.redisService.get(key)
        let whiteList: string[]
        try {
            whiteList = val != null ? (JSON.parse(val)) as string[] : []
        } catch {
            whiteList = []
        }
        return whiteList
    }



    // ✅ distruzione "strict"
    public async destroySession(sessionId: string, deviceId: string, userId?: UUID): Promise<void> {
        const { key, userId: resolvedUid } = await this.resolveSessionContext(sessionId, userId)
        if (!key) {
            return
        }

        const expectedDeviceId = await this.redisService.hget(key, 'deviceId')
        if (expectedDeviceId && expectedDeviceId !== deviceId) {
            throw new ForbiddenException('NotAllowedAction')
        }

        const uid = resolvedUid ?? this.getUserIdFromSessionKey(key)
        const client = this.redisService.getClient()
        const pipe = client.pipeline()

        if (uid) pipe.srem(`user_sessions:${uid}`, sessionId)
        if (typeof (client as any).unlink === 'function') {
            (pipe as any).unlink(key)
        } else {
            pipe.del(key)
        }
        await pipe.exec()
    }

    // ✅ distruzione "by owner"
    public async destroySessionByOwner(sessionId: string, userId: string): Promise<void> {

        const key = this.getSessionKeyOrPattern(sessionId, userId)

        // se la sessione non esiste più, fai solo cleanup indici ed esci
        const exists = await this.redisService.hget(key, 'sessionId')
        const client = this.redisService.getClient()
        const pipe = client.pipeline()

        pipe.srem(`user_sessions:${userId}`, sessionId)

        if (exists) {
            if (typeof (client as any).unlink === 'function') {
                (pipe as any).unlink(key)
            } else {
                pipe.del(key)
            }
        }

        await pipe.exec()
    }

    public async destroyAllSessionsAndRevokeAllTokensByUserId(userId: string): Promise<void> {
        const pattern = `session:*:${userId}`
        const keys = await this.redisService.scanIterate(pattern)
        if (!keys.length) {
            await this.redisService.getClient().del(`user_sessions:${userId}`)
            return
        }

        const client = this.redisService.getClient()
        const pipeline = client.pipeline()

        for (const key of keys) {
            const parts = key.split(':')
            if (parts.length !== 3) {
                continue
            }

            const sid = parts[1]

            const jtis = await this.getJtiListBySessionId(sid)
            for (const jti of jtis) {
                await this.setRevokedJti(jti, sid)
            }

            pipeline.srem(`user_sessions:${userId}`, sid)

            if (typeof client.unlink === 'function') {
                pipeline.unlink(key)
            } else {
                pipeline.del(key)
            }
        }

        pipeline.exec()

        const remaining = await this.redisService.getClient().scard(`user_sessions:${userId}`)
        if (remaining === 0) {
            await this.redisService.del(`user_sessions:${userId}`)
        }
    }

    public async destroySessionAndRevokeAllTokensByPlainSessionId(sessionId: UUID, userId?: UUID): Promise<void> {
        const signedSessionId = this.signSessionId(sessionId)
        await this.destroySessionAndRevokeAllTokensBySignedSessionId(signedSessionId, userId)
    }

    public async destroySessionAndRevokeAllTokensBySignedSessionId(signedSessionId: string, userId?: string): Promise<void> {

        const sessionId = this.verifyAndParseSignedSessionId(signedSessionId)

        const { key, userId: uid } = await this.resolveSessionContext(sessionId, userId)
        if (!uid || !key) throw new RpcException('InvalidSession')

        const exists = await this.redisService.hget(key, 'sessionId')

        const client = this.redisService.getClient()
        const pipeline = client.pipeline()

        const jtis = await this.getJtiListBySessionId(sessionId)
        for (const jti of jtis) {
            await this.setRevokedJti(jti, sessionId)
        }

        pipeline.srem(`user_sessions:${uid}`, sessionId)

        if (exists) {
            if (typeof client.unlink === 'function') {
                pipeline.unlink(key)
            } else {
                pipeline.del(key)
            }
        }

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
