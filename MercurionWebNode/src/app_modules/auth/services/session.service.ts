import { Injectable } from '@nestjs/common';
import { randomUUID, UUID } from 'crypto';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { ISession, ISessionDeviceInfo } from '../Models/interfaces/i-session.interface';
import { nullish } from 'src/Models/nullish.type';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class SessionService {
    constructor(private readonly redisService: RedisService) { }

    private getSessionKey(sessionId: string): string {
        return `session:${sessionId}`
    }

    // 🔹 Creazione di una nuova sessione (semplificata con Omit<>)
    async createSession(
        sessionData: Omit<ISession, 'sessionId' | 'expiresAt' | 'lastAccessedAt' | 'valid' | 'doNotAskMfaPhoneNumberVerification'>,
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
            valid: false,
            doNotAskMfaPhoneNumberVerification: false
        };

        const sessionKey = this.getSessionKey(sessionId);

        await this.redisService.hset(sessionKey, 'sessionId', sessionId)
        await this.redisService.hset(sessionKey, 'userId', sessionData.userId)
        await this.redisService.hset(sessionKey, 'deviceId', sessionData.deviceId)
        await this.redisService.hset(sessionKey, 'expiresAt', expiresAt.toString())
        await this.redisService.hset(sessionKey, 'lastAccessedAt', session.lastAccessedAt.toString())
        await this.redisService.hset(sessionKey, 'IP', sessionData.IP)
        await this.redisService.hset(sessionKey, 'valid', 'false')
        await this.redisService.hset(sessionKey, 'longTerm', rememberMe.toString())
        await this.redisService.hset(sessionKey, 'sessionDeviceInfo', JSON.stringify(sessionData.sessionDeviceInfo))
        await this.redisService.hset(sessionKey, 'doNotAskMfaPhoneNumberVerification', JSON.stringify(session.doNotAskMfaPhoneNumberVerification))

        await this.redisService.setTTL(sessionKey, ttlSeconds)

        return session;
    }


    async activateSession(sessionId: string): Promise<void> | never {
        const session = await this.getSession(sessionId)
        if (!session) throw new RpcException('UnauthorizedNoSuchSession')
        await this.redisService.hset(this.getSessionKey(sessionId), 'valid', 'true')
    }


    // 🔹 Recupero dell'intera sessione
    async getSession(sessionId: string): Promise<ISession | null> {

        const sessionData: Record<string, string> | nullish = await this.redisService.hgetall(this.getSessionKey(sessionId))

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
            doNotAskMfaPhoneNumberVerification: JSON.parse(sessionData.doNotAskMfaPhoneNumberVerification) as boolean
        }

        return session

    }

    // 🔹 Validazione della sessione, deviceId e scadenza
    async validateSession(sessionId: string, deviceId: string): Promise<boolean> {
        const session = await this.getSession(sessionId)

        if (session == null) return false

        if (!session) return false // Sessione inesistente
        if (!session.valid) return false // Sessione invalidata
        if (session.deviceId !== deviceId) return false // Device non corrisponde
        if (session.expiresAt < Date.now()) return false // 🔥 Blocco se la sessione è scaduta

        return true
    }


    // 🔹 Aggiornare lastAccessedAt ad ogni accesso
    async updateLastAccessed(sessionId: string): Promise<void> {
        const sessionKey = this.getSessionKey(sessionId)
        const now = Date.now()

        const longTermRaw = await this.redisService.hget(sessionKey, 'longTerm')
        const isLongTerm = longTermRaw === 'true'

        if (!isLongTerm) {
            const newTTL = 60 * 60; // Rinnovo TTL solo se sessione breve
            await this.redisService.setTTL(sessionKey, newTTL)
        }

        await this.redisService.hset(sessionKey, 'lastAccessedAt', now.toString())
    }



    // 🔹 Aggiornare doNotAskMfaPhoneNumberVerification ad ogni accesso
    async updateDoNotAskMfaPhoneNumberVerification(sessionId: string, value: boolean): Promise<void> {
        await this.redisService.hset(this.getSessionKey(sessionId), 'doNotAskMfaPhoneNumberVerification', value.toString())
    }

    async isDoNotAskMfaPhoneNumberVerification(sessionId: UUID): Promise<boolean> {
        const prop = await this.redisService.hget(this.getSessionKey(sessionId), 'doNotAskMfaPhoneNumberVerification')
        if (prop == undefined) return false
        return JSON.parse(prop) as boolean
    }

    // 🔹 Revocare una sessione (es. logout o invalidazione)
    async revokeSession(sessionId: string): Promise<void> {
        await this.redisService.hset(this.getSessionKey(sessionId), 'valid', 'false');
    }

    // 🔹 Revoca e blacklist di un token specifico
    async revokeToken(jti: string): Promise<void> {
        await this.redisService.sadd(`revoked:${jti}`, jti);
    }

    // 🔹 Controlla se il token è stato revocato
    async isTokenRevoked(jti: string): Promise<boolean> {
        return await this.redisService.sismember(`revoked:${jti}`, jti);
    }
}
