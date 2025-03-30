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
        ttlSeconds: number
    ): Promise<ISession> {
        const sessionId = randomUUID();
        const expiresAt = Date.now() + ttlSeconds * 1000;

        const session: ISession = {
            sessionId,
            ...sessionData,
            expiresAt,
            lastAccessedAt: Date.now(),
            valid: false,
            doNotAskMfaPhoneNumberVerification: false
        }

        const { IP, deviceId, sessionDeviceInfo, userId } = sessionData

        // Salvare la sessione in Redis
        const sessionKey = this.getSessionKey(sessionId);
        await this.redisService.hset(sessionKey, 'sessionId', sessionId)
        await this.redisService.hset(sessionKey, 'userId', userId)
        await this.redisService.hset(sessionKey, 'deviceId', deviceId)
        await this.redisService.hset(sessionKey, 'expiresAt', expiresAt.toString())
        await this.redisService.hset(sessionKey, 'lastAccessedAt', session.lastAccessedAt.toString())
        await this.redisService.hset(sessionKey, 'IP', IP)
        await this.redisService.hset(sessionKey, 'valid', 'false')
        await this.redisService.hset(sessionKey, 'sessionDeviceInfo', JSON.stringify(sessionDeviceInfo))
        await this.redisService.hset(sessionKey, 'doNotAskMfaPhoneNumberVerification', 'false')

        // Imposta il TTL della sessione in Redis
        await this.redisService.setTTL(sessionKey, ttlSeconds)

        return session
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
        await this.redisService.hset(this.getSessionKey(sessionId), 'lastAccessedAt', Date.now().toString());
    }
    
    // 🔹 Aggiornare doNotAskMfaPhoneNumberVerification ad ogni accesso
    async updateDoNotAskMfaPhoneNumberVerification(sessionId: string, value: boolean): Promise<void> {
        await this.redisService.hset(this.getSessionKey(sessionId), 'doNotAskMfaPhoneNumberVerification', value.toString())
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
