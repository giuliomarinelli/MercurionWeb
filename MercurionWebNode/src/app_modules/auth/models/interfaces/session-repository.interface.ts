import type { UUID } from 'crypto'
import type { GeoLocation } from '../../services/geo-ip.service'
import type {
    ISession,
    ISSO_SessionActivationData
} from './i-session.interface'
import type { SessionFetchOptions } from './session-fetch-options.interface'

export const SESSION_REPOSITORY = Symbol('SESSION_REPOSITORY')

export interface PersistSessionOptions {
    longTerm: boolean
    ttlSeconds: number
}

export interface SessionRepository {
    getActivatedSessionIds(userId: UUID): Promise<string[]>
    saveSession(session: ISession, options: PersistSessionOptions): Promise<void>
    activateSession(
        sessionId: string,
        userId: string,
        activationData?: ISSO_SessionActivationData
    ): Promise<void>
    isSessionLongTerm(sessionId: UUID, userId: UUID): Promise<boolean>
    findSessionsByUserId(userId: string, options?: SessionFetchOptions): Promise<ISession[]>
    findSessionIdsByUserId(userId: string): Promise<string[]>
    findSession(sessionId: string, userId?: string): Promise<ISession | null>
    resolveSessionOwner(sessionId: string, userId?: string): Promise<string | undefined>
    sessionExists(sessionId: string): Promise<boolean>
    touchSession(sessionId: string, shortSessionTtl: number, userId?: string): Promise<void>
    invalidateSession(sessionId: string, userId?: string): Promise<void>
    deleteSessionByOwner(sessionId: string, userId: string): Promise<void>
    clearUserSessionIndex(userId: string): Promise<void>

    registerIssuedToken(sessionId: string, jti: string, ttlSeconds: number): Promise<void>
    revokeToken(jti: string, sessionId?: string): Promise<void>
    isTokenRevoked(jti: string): Promise<boolean>
    findIssuedJtis(sessionId: string): Promise<string[]>

    getFingerprintWhiteList(userId: UUID): Promise<string[]>
    trustFingerprint(userId: UUID, fingerprint: string): Promise<void>
    isFingerprintTrusted(userId: UUID, fingerprint: string): Promise<boolean>
    getTrustedLocations(userId: UUID): Promise<GeoLocation[]>
    saveTrustedLocations(userId: UUID, locations: GeoLocation[]): Promise<void>
    rememberDeviceId(deviceId: string, userId: string): Promise<void>
    isDeviceIdKnown(deviceId: string, userId: string): Promise<boolean>
}
