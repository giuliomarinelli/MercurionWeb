import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { randomUUID, UUID } from 'crypto'
import {
    ApplicationErrorCode,
    applicationError,
    applicationHttpException
} from 'src/exception-handling/application-error'
import type {
    ISession,
    ISSO_SessionActivationData
} from '../Models/interfaces/i-session.interface'
import type { SessionFetchOptions } from '../Models/interfaces/session-fetch-options.interface'
import {
    SESSION_REPOSITORY,
    type SessionRepository
} from '../Models/interfaces/session-repository.interface'
import type { SessionDTO } from '../Models/DTO/session.dto'
import type { GeoLocation } from './geo-ip.service'
import { SessionIdentityService } from './session-identity.service'

@Injectable()
export class SessionService {

    private readonly shortSessionTtl: number
    private readonly longSessionTtl: number

    constructor(
        @Inject(SESSION_REPOSITORY)
        private readonly repository: SessionRepository,
        private readonly identity: SessionIdentityService,
        configService: ConfigService
    ) {
        this.shortSessionTtl = configService.get<number>('Session.shortSessionLasting')!
        this.longSessionTtl = configService.get<number>('Session.persistentSessionLasting')!
    }

    private toDTO(session: ISession, current = false, showValid = true): SessionDTO {
        return {
            id: this.identity.sign(session.sessionId),
            createdAt: session.createdAt,
            expiresAt: session.expiresAt,
            lastAccessedAt: session.lastAccessedAt,
            valid: showValid ? session.valid : undefined,
            current,
            location: session.location,
            browser: session.sessionDeviceInfo.browser.name ?? '',
            provider: session.provider
        }
    }

    public async getActivatedSessionsForUser(userId: UUID): Promise<string[]> {
        return this.repository.getActivatedSessionIds(userId)
    }

    public async revokeManyJtis(jtis: string[], sessionId?: string): Promise<void> {
        await Promise.all(jtis.map(jti => this.repository.revokeToken(jti, sessionId)))
    }

    public async createSession(
        sessionData: Omit<
            ISession,
            'createdAt' | 'sessionId' | 'expiresAt' | 'lastAccessedAt' | 'valid'
        >,
        rememberMe: boolean
    ): Promise<ISession> {
        const sessionsForDevice = (
            await this.getAllSessionsByUserId(sessionData.userId)
        ).filter(session => session.deviceId === sessionData.deviceId)

        for (const session of sessionsForDevice) {
            await this.destroySession(session.sessionId, session.deviceId, session.userId)
        }

        const now = Date.now()
        const session: ISession = {
            sessionId: randomUUID(),
            ...sessionData,
            expiresAt: now + this.longSessionTtl * 1000,
            createdAt: now,
            lastAccessedAt: now,
            valid: false,
            provider: sessionData.provider
        }
        await this.repository.saveSession(session, {
            longTerm: rememberMe,
            ttlSeconds: rememberMe ? this.longSessionTtl : this.shortSessionTtl
        })
        return session
    }

    public async activateSession(
        sessionId: string,
        userId: string,
        ssoData?: ISSO_SessionActivationData
    ): Promise<void> {
        if (!await this.getSession(sessionId, userId)) {
            throw applicationError(ApplicationErrorCode.SESSION_NOT_FOUND)
        }
        await this.repository.activateSession(sessionId, userId, ssoData)
    }

    public async isSessionLongTerm(sessionId: UUID, userId: UUID): Promise<boolean> {
        return this.repository.isSessionLongTerm(sessionId, userId)
    }

    public async getAllSessionsByUserId(
        userId: string,
        options?: SessionFetchOptions
    ): Promise<ISession[]> {
        return this.repository.findSessionsByUserId(userId, options)
    }

    public async getAllActiveSessionsByUserIdAsDTOs(
        userId: string,
        currentSessionId: UUID
    ): Promise<SessionDTO[]> {
        const sessions = await this.getAllSessionsByUserId(userId, { onlyValid: true })
        return sessions.map(session =>
            this.toDTO(session, session.sessionId === currentSessionId)
        )
    }

    public async validateSession(
        sessionId: string,
        deviceId: string,
        userId?: string
    ): Promise<boolean> {
        const session = await this.getSession(sessionId, userId)
        return session !== null
            && session.valid
            && session.deviceId === deviceId
            && session.expiresAt >= Date.now()
    }

    public async existsSession(sessionId: string): Promise<boolean> {
        return this.repository.sessionExists(sessionId)
    }

    public async getSession(sessionId: string, userId?: string): Promise<ISession | null> {
        return this.repository.findSession(sessionId, userId)
    }

    public async updateLastAccessed(sessionId: string, userId?: string): Promise<void> {
        await this.repository.touchSession(sessionId, this.shortSessionTtl, userId)
    }

    public async revokeSession(sessionId: string, userId?: string): Promise<void> {
        await this.repository.invalidateSession(sessionId, userId)
    }

    public async registerIssuedToken(
        sessionId: string,
        jti: string,
        ttlSeconds: number
    ): Promise<void> {
        await this.repository.registerIssuedToken(sessionId, jti, ttlSeconds)
    }

    public async revokeToken(jti: string, sessionId?: string): Promise<void> {
        await this.repository.revokeToken(jti, sessionId)
    }

    public async isTokenRevoked(jti: string): Promise<boolean> {
        return this.repository.isTokenRevoked(jti)
    }

    public async revokeAllTokensBySessionId(sessionId: string): Promise<void> {
        await this.revokeManyJtis(await this.getJtiListBySessionId(sessionId), sessionId)
    }

    public async getJtiListBySessionId(sessionId: string): Promise<string[]> {
        return this.repository.findIssuedJtis(sessionId)
    }

    public async getFingerprintWhiteList(userId: UUID): Promise<string[]> {
        return this.repository.getFingerprintWhiteList(userId)
    }

    public async destroySession(
        sessionId: string,
        deviceId: string,
        userId?: UUID
    ): Promise<void> {
        const owner = await this.repository.resolveSessionOwner(sessionId, userId)
        if (!owner) {
            return
        }

        const session = await this.repository.findSession(sessionId, owner)
        if (session?.deviceId && session.deviceId !== deviceId) {
            throw applicationHttpException(ApplicationErrorCode.ACTION_NOT_ALLOWED)
        }
        await this.repository.deleteSessionByOwner(sessionId, owner)
    }

    public async destroySessionByOwner(sessionId: string, userId: string): Promise<void> {
        await this.repository.deleteSessionByOwner(sessionId, userId)
    }

    public async destroyAllSessionsAndRevokeAllTokensByUserId(
        userId: string
    ): Promise<void> {
        const sessionIds = await this.repository.findSessionIdsByUserId(userId)
        if (sessionIds.length === 0) {
            await this.repository.clearUserSessionIndex(userId)
            return
        }

        for (const sessionId of sessionIds) {
            await this.revokeAllTokensBySessionId(sessionId)
            await this.repository.deleteSessionByOwner(sessionId, userId)
        }
    }

    public async destroySessionAndRevokeAllTokensByPlainSessionId(
        sessionId: UUID,
        userId?: UUID
    ): Promise<void> {
        await this.destroySessionAndRevokeAllTokensBySignedSessionId(
            this.identity.sign(sessionId),
            userId
        )
    }

    public async destroySessionAndRevokeAllTokensBySignedSessionId(
        signedSessionId: string,
        userId?: string
    ): Promise<void> {
        const sessionId = this.identity.verifyAndParse(signedSessionId)
        const owner = await this.repository.resolveSessionOwner(sessionId, userId)
        if (!owner) {
            throw applicationError(ApplicationErrorCode.SESSION_INVALID)
        }

        await this.revokeAllTokensBySessionId(sessionId)
        await this.repository.deleteSessionByOwner(sessionId, owner)
    }

    public async addFingerprintToWhiteList(
        userId: UUID,
        fingerprint: string
    ): Promise<void> {
        await this.repository.trustFingerprint(userId, fingerprint)
    }

    public async isFingerprintInWhiteList(
        userId: UUID,
        fingerprint: string
    ): Promise<boolean> {
        return this.repository.isFingerprintTrusted(userId, fingerprint)
    }

    public async addTrustedLocation(
        userId: UUID,
        location: GeoLocation
    ): Promise<void> {
        if (location.latitude == null || location.longitude == null) {
            return
        }

        const locations = await this.repository.getTrustedLocations(userId)
        const alreadyPresent = locations.some(existing =>
            Math.abs(existing.latitude - location.latitude) < 0.001
            && Math.abs(existing.longitude - location.longitude) < 0.001
        )
        if (!alreadyPresent) {
            await this.repository.saveTrustedLocations(userId, [...locations, location])
        }
    }

    public async getTrustedLocations(userId: UUID): Promise<GeoLocation[]> {
        return this.repository.getTrustedLocations(userId)
    }

    public async setDeviceIdAsKnown(deviceId: string, userId: string): Promise<void> {
        await this.repository.rememberDeviceId(deviceId, userId)
    }

    public async isKnownDeviceId(deviceId: string, userId: string): Promise<boolean> {
        return this.repository.isDeviceIdKnown(deviceId, userId)
    }
}
