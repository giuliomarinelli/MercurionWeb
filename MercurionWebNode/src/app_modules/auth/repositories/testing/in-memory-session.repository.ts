import type { UUID } from 'crypto'
import type { GeoLocation } from '../../services/geo-ip.service'
import type {
    ISession,
    ISSO_SessionActivationData
} from '../../Models/interfaces/i-session.interface'
import type { SessionFetchOptions } from '../../Models/interfaces/session-fetch-options.interface'
import type {
    PersistSessionOptions,
    SessionRepository
} from '../../Models/interfaces/session-repository.interface'

export class InMemorySessionRepository implements SessionRepository {

    private readonly sessions = new Map<string, ISession>()
    private readonly longTermSessions = new Set<string>()
    private readonly userSessionIds = new Map<string, Set<string>>()
    private readonly revokedTokens = new Set<string>()
    private readonly issuedJtis = new Map<string, string[]>()
    private readonly fingerprintWhiteLists = new Map<string, string[]>()
    private readonly trustedFingerprints = new Set<string>()
    private readonly trustedLocations = new Map<string, GeoLocation[]>()
    private readonly knownDevices = new Set<string>()

    private key(sessionId: string, userId: string): string {
        return `${sessionId}:${userId}`
    }

    private cloneSession(session: ISession): ISession {
        return {
            ...session,
            sessionDeviceInfo: structuredClone(session.sessionDeviceInfo)
        }
    }

    public async getActivatedSessionIds(userId: UUID): Promise<string[]> {
        return [...(this.userSessionIds.get(userId) ?? [])]
    }

    public async saveSession(
        session: ISession,
        options: PersistSessionOptions
    ): Promise<void> {
        const key = this.key(session.sessionId, session.userId)
        this.sessions.set(key, this.cloneSession(session))
        if (options.longTerm) {
            this.longTermSessions.add(key)
        } else {
            this.longTermSessions.delete(key)
        }
        const ids = this.userSessionIds.get(session.userId) ?? new Set<string>()
        ids.add(session.sessionId)
        this.userSessionIds.set(session.userId, ids)
    }

    public async activateSession(
        sessionId: string,
        userId: string,
        activationData?: ISSO_SessionActivationData
    ): Promise<void> {
        const key = this.key(sessionId, userId)
        const session = this.sessions.get(key)
        if (!session) {
            return
        }
        this.sessions.set(key, {
            ...session,
            ...activationData,
            valid: true,
            sessionDeviceInfo: activationData?.sessionDeviceInfo
                ? structuredClone(activationData.sessionDeviceInfo)
                : session.sessionDeviceInfo
        })
    }

    public async isSessionLongTerm(sessionId: UUID, userId: UUID): Promise<boolean> {
        return this.longTermSessions.has(this.key(sessionId, userId))
    }

    public async findSessionsByUserId(
        userId: string,
        options?: SessionFetchOptions
    ): Promise<ISession[]> {
        const sessions = [...this.sessions.values()]
            .filter(session => session.userId === userId)
            .map(session => this.cloneSession(session))
        return options?.onlyValid
            ? sessions.filter(session => session.valid)
            : sessions
    }

    public async findSessionIdsByUserId(userId: string): Promise<string[]> {
        return [...this.sessions.values()]
            .filter(session => session.userId === userId)
            .map(session => session.sessionId)
    }

    public async findSession(sessionId: string, userId?: string): Promise<ISession | null> {
        const session = userId
            ? this.sessions.get(this.key(sessionId, userId))
            : [...this.sessions.values()].find(value => value.sessionId === sessionId)
        return session ? this.cloneSession(session) : null
    }

    public async resolveSessionOwner(
        sessionId: string,
        userId?: string
    ): Promise<string | undefined> {
        if (userId) {
            return userId
        }
        const session = [...this.sessions.values()]
            .find(value => value.sessionId === sessionId)
        if (session) {
            return session.userId
        }
        return [...this.userSessionIds.entries()]
            .find(([, ids]) => ids.has(sessionId))?.[0]
    }

    public async sessionExists(sessionId: string): Promise<boolean> {
        return [...this.sessions.values()].some(session => session.sessionId === sessionId)
    }

    public async touchSession(
        sessionId: string,
        _shortSessionTtl: number,
        userId?: string
    ): Promise<void> {
        const owner = await this.resolveSessionOwner(sessionId, userId)
        if (!owner) {
            return
        }
        const key = this.key(sessionId, owner)
        const session = this.sessions.get(key)
        if (session) {
            this.sessions.set(key, { ...session, lastAccessedAt: Date.now() })
        }
    }

    public async invalidateSession(sessionId: string, userId?: string): Promise<void> {
        const owner = await this.resolveSessionOwner(sessionId, userId)
        if (!owner) {
            return
        }
        const key = this.key(sessionId, owner)
        const session = this.sessions.get(key)
        if (session) {
            this.sessions.set(key, { ...session, valid: false })
        }
    }

    public async deleteSessionByOwner(sessionId: string, userId: string): Promise<void> {
        const key = this.key(sessionId, userId)
        this.sessions.delete(key)
        this.longTermSessions.delete(key)
        const ids = this.userSessionIds.get(userId)
        ids?.delete(sessionId)
        if (ids?.size === 0) {
            this.userSessionIds.delete(userId)
        }
    }

    public async clearUserSessionIndex(userId: string): Promise<void> {
        this.userSessionIds.delete(userId)
    }

    public async registerIssuedToken(
        sessionId: string,
        jti: string,
        ttlSeconds: number
    ): Promise<void> {
        void ttlSeconds
        const jtis = this.issuedJtis.get(sessionId) ?? []
        this.issuedJtis.set(sessionId, [...jtis, jti])
    }

    public async revokeToken(jti: string, sessionId?: string): Promise<void> {
        void sessionId
        this.revokedTokens.add(jti)
    }

    public async isTokenRevoked(jti: string): Promise<boolean> {
        return this.revokedTokens.has(jti)
    }

    public async findIssuedJtis(sessionId: string): Promise<string[]> {
        return [...(this.issuedJtis.get(sessionId) ?? [])]
    }

    public async getFingerprintWhiteList(userId: UUID): Promise<string[]> {
        return [...(this.fingerprintWhiteLists.get(userId) ?? [])]
    }

    public async trustFingerprint(userId: UUID, fingerprint: string): Promise<void> {
        this.trustedFingerprints.add(`${userId}:${fingerprint}`)
    }

    public async isFingerprintTrusted(
        userId: UUID,
        fingerprint: string
    ): Promise<boolean> {
        return this.trustedFingerprints.has(`${userId}:${fingerprint}`)
    }

    public async getTrustedLocations(userId: UUID): Promise<GeoLocation[]> {
        return structuredClone(this.trustedLocations.get(userId) ?? [])
    }

    public async saveTrustedLocations(
        userId: UUID,
        locations: GeoLocation[]
    ): Promise<void> {
        this.trustedLocations.set(userId, structuredClone(locations))
    }

    public async rememberDeviceId(deviceId: string, userId: string): Promise<void> {
        this.knownDevices.add(`${userId}:${deviceId}`)
    }

    public async isDeviceIdKnown(deviceId: string, userId: string): Promise<boolean> {
        return this.knownDevices.has(`${userId}:${deviceId}`)
    }
}
