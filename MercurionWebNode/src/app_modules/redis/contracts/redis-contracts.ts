/**
 * Redis namespace ownership and adapter-boundary contracts.
 *
 * DATA-030 owns session indexing/atomicity and DATA-037 owns record
 * serialization. These builders intentionally describe only the existing key
 * vocabulary and do not prescribe either future storage contract.
 */

export type RedisKey = string & { readonly __redisKey: unique symbol }
export type RedisKeyPattern = string & { readonly __redisKeyPattern: unique symbol }
export type RedisTtlSeconds = number & { readonly __redisTtlSeconds: unique symbol }

export type RequiredRedisCapability = 'keyevent-notifications' | 'expired-key-events' | 'generic-key-events'

export interface RedisCapabilityPolicy {
    readonly setting: 'notify-keyspace-events'
    readonly requiredFlags: readonly string[]
    readonly capabilities: readonly RequiredRedisCapability[]
}

export const redisCapabilityPolicy: RedisCapabilityPolicy = Object.freeze({
    setting: 'notify-keyspace-events',
    requiredFlags: ['E', 'x', 'g'],
    capabilities: [
        'keyevent-notifications',
        'expired-key-events',
        'generic-key-events'
    ] as const
})

export interface RedisCapabilityDiagnostic {
    readonly setting: RedisCapabilityPolicy['setting']
    readonly configuredFlags: string
    readonly missingFlags: readonly string[]
    readonly missingCapabilities: readonly RequiredRedisCapability[]
}

export class RedisCapabilityError extends Error {
    readonly code = 'REDIS_REQUIRED_CAPABILITY_MISSING'

    constructor(readonly diagnostic: RedisCapabilityDiagnostic) {
        super(
            `Redis ${diagnostic.setting} is missing required capabilities: ` +
            `${diagnostic.missingCapabilities.join(', ')} ` +
            `(missing flags: ${diagnostic.missingFlags.join('')})`
        )
        this.name = 'RedisCapabilityError'
    }
}

export function validateRedisCapabilities(configuredFlags: string): RedisCapabilityDiagnostic | undefined {
    const missingFlags = redisCapabilityPolicy.requiredFlags.filter(flag => !configuredFlags.includes(flag))
    if (missingFlags.length === 0) return undefined

    const capabilityByFlag: Record<string, RequiredRedisCapability> = {
        E: 'keyevent-notifications',
        x: 'expired-key-events',
        g: 'generic-key-events'
    }
    return {
        setting: redisCapabilityPolicy.setting,
        configuredFlags,
        missingFlags,
        missingCapabilities: missingFlags.map(flag => capabilityByFlag[flag])
    }
}

const key = (value: string): RedisKey => value as RedisKey
const pattern = (value: string): RedisKeyPattern => value as RedisKeyPattern

export function ttlSeconds(value: number): RedisTtlSeconds {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Redis TTL must be a positive integer number of seconds: ${value}`)
    }
    return value as RedisTtlSeconds
}

export const redisDurations = {
    seconds(value: number): RedisTtlSeconds {
        return ttlSeconds(value)
    },
    minutes(value: number): RedisTtlSeconds {
        return ttlSeconds(value * 60)
    },
    hours(value: number): RedisTtlSeconds {
        return ttlSeconds(value * 60 * 60)
    },
    days(value: number): RedisTtlSeconds {
        return ttlSeconds(value * 24 * 60 * 60)
    }
}

/**
 * Owner-specific builders. Every production key in a governed namespace must
 * be constructed here rather than interpolated at an arbitrary call site.
 */
export const redisKeys = {
    session: {
        record: (sessionId: string, userId: string) =>
            key(`session:${sessionId}:${userId}`),
        recordsBySession: (sessionId: string) =>
            pattern(`session:${sessionId}:*`),
        recordsByUser: (userId: string) =>
            pattern(`session:*:${userId}`),
        allUserIndexes: () =>
            pattern('user_sessions:*'),
        userIndex: (userId: string) =>
            key(`user_sessions:${userId}`)
    },
    token: {
        issued: (sessionId: string, jti: string) =>
            key(`issued:${sessionId}:${jti}`),
        issuedBySession: (sessionId: string) =>
            pattern(`issued:${sessionId}:*`),
        issuedByJti: (jti: string) =>
            pattern(`issued:*:${jti}`),
        revoked: (jti: string) =>
            key(`revoked:${jti}`)
    },
    trust: {
        fingerprintWhitelist: (userId: string) =>
            key(`fingerprintsWhiteList:${userId}`),
        fingerprint: (userId: string, fingerprint: string) =>
            key(`fingerprint:${userId}:${fingerprint}`),
        location: (userId: string) =>
            key(`trustedLocation:${userId}`),
        device: (userId: string) =>
            key(`knownDeviceId:${userId}`)
    },
    authentication: {
        loginFailures: (email: string) =>
            key(`auth:fails:${email.toLowerCase()}`),
        loginLock: (email: string) =>
            key(`auth:lock:${email.toLowerCase()}`)
    },
    account: {
        registrationLock: (emailDigest: string) =>
            key(`email_registration_lock:${emailDigest}`),
        changeFailure: (kind: string, userId: string) =>
            key(`change:${kind}:totp:fail:${userId}`),
        changeLock: (kind: string, userId: string) =>
            key(`change:${kind}:totp:lock:${userId}`),
        changeSend: (kind: string, userId: string) =>
            key(`change:${kind}:send:${userId}`),
        changeSendLock: (kind: string, userId: string) =>
            key(`change:${kind}:send:lock:${userId}`),
        recoveryFailure: (codeDigest: string) =>
            key(`recovery:fail:${codeDigest}`),
        recoveryLock: (codeDigest: string) =>
            key(`recovery:lock:${codeDigest}`),
        recoverySecondFailure: (userId: string) =>
            key(`recovery:second:fail:${userId}`),
        recoverySecondLock: (userId: string) =>
            key(`recovery:second:lock:${userId}`),
        passwordFailure: (context: string, userId: string) =>
            key(`pwd:fail:${context}:${userId}`),
        passwordLock: (context: string, userId: string) =>
            key(`pwd:lock:${context}:${userId}`),
        passwordResetSend: (context: string, userId: string) =>
            key(`pwd:reset:${context}:send:${userId}`),
        passwordResetSendLock: (context: string, userId: string) =>
            key(`pwd:reset:${context}:send:lock:${userId}`),
        emailChangeLock: (emailDigest: string) =>
            key(`email_change_lock:${emailDigest}`),
        phoneChangeLock: (phoneDigest: string) =>
            key(`phone_change_lock:${phoneDigest}`),
        phoneChangeLockForUser: (userDigest: string, phoneDigest: string) =>
            key(`phone_change_lock:${userDigest}:${phoneDigest}`),
        changePasswordLock: (jti: string) =>
            key(`changePasswordLock:${jti}`)
    },
    mfa: {
        preAuthorizationDevice: (jti: string) =>
            key(`mfa:pat:dev:${jti}`),
        temporaryAppSecret: (userId: string) =>
            key(`mfa:temp:app-secret:${userId}`),
        failure: (context: string, userId: string, strategy: string) =>
            key(`mfa:fail:${context}:${userId}:${strategy}`),
        lock: (context: string, userId: string, strategy: string) =>
            key(`mfa:lock:${context}:${userId}:${strategy}`),
        send: (context: string, userId: string, strategy: string) =>
            key(`mfa:${context}:${userId}:${strategy}`),
        sendLock: (context: string, userId: string, strategy: string) =>
            key(`mfa:${context}:lock:${userId}:${strategy}`),
        backupFailure: (userId: string) =>
            key(`mfa:backup:fail:${userId}`),
        backupLock: (userId: string) =>
            key(`mfa:backup:lock:${userId}`),
        backupRegeneration: (userId: string) =>
            key(`mfa:backup:regen:${userId}`),
        backupRegenerationLock: (userId: string) =>
            key(`mfa:backup:regen:lock:${userId}`)
    },
    feedback: {
        sendCount: (userId: string) =>
            key(`feedback:send:count:${userId}`),
        sendLock: (userId: string) =>
            key(`feedback:send:lock:${userId}`)
    },
    oauth: {
        accessToken: (provider: string, userId?: string) =>
            key(`access_token:${provider}${userId ? `:${userId}` : ''}`),
        refreshLock: (provider: string, userId?: string) =>
            key(`oauth2:refresh_lock:${provider}:${userId ?? '__global__'}`)
    },
    sso: {
        state: (provider: string, hashedState: string) =>
            key(`oauth2:state:${provider}:${hashedState}`),
        redirectTo: (provider: string) =>
            key(`oauth2:redirect_to:${provider}`)
    }
}
