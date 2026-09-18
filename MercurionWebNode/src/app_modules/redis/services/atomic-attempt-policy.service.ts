import { Injectable } from '@nestjs/common'
import type { RedisKey, RedisTtlSeconds } from '../contracts/redis-contracts'
import { RedisService } from './redis.service'

export type AtomicAttemptKind = 'failure' | 'send'

export interface AtomicAttemptPolicy {
    readonly id: string
    readonly limit: number
    readonly windowSeconds: RedisTtlSeconds
    readonly lockSeconds: RedisTtlSeconds
    readonly lockWhen: 'atLeast' | 'above'
    readonly resetOnSuccess: boolean
    readonly errorCode: string
}

export interface AtomicAttemptResult {
    readonly count: number
    readonly locked: boolean
    readonly allowed: boolean
}

const policy = (
    id: string,
    limit: number,
    windowSeconds: RedisTtlSeconds,
    lockSeconds: RedisTtlSeconds,
    lockWhen: AtomicAttemptPolicy['lockWhen'],
    errorCode: string,
    resetOnSuccess = true
): AtomicAttemptPolicy => Object.freeze({
    id,
    limit,
    windowSeconds,
    lockSeconds,
    lockWhen,
    resetOnSuccess,
    errorCode
})

/**
 * The only source of truth for governed attempt and send limits.
 *
 * Keep policy identity separate from key construction: callers choose the
 * canonical keys, while this registry owns the security contract.
 */
export const atomicAttemptPolicies = Object.freeze({
    authenticationLogin: policy('authentication.login', 8, 15 * 60 as RedisTtlSeconds, 5 * 60 as RedisTtlSeconds, 'atLeast', 'AUTHENTICATION_TOO_MANY_ATTEMPTS'),
    accountContactFailure: policy('account.contact.failure', 5, 10 * 60 as RedisTtlSeconds, 15 * 60 as RedisTtlSeconds, 'atLeast', 'ACCOUNT_CONTACT_CHANGE_TOO_MANY_ATTEMPTS'),
    accountContactSend: policy('account.contact.send', 5, 10 * 60 as RedisTtlSeconds, 15 * 60 as RedisTtlSeconds, 'above', 'ACCOUNT_CONTACT_CHANGE_SEND_TOO_MANY_REQUESTS'),
    accountPasswordFailure: policy('account.password.failure', 5, 10 * 60 as RedisTtlSeconds, 15 * 60 as RedisTtlSeconds, 'atLeast', 'PASSWORD_TOO_MANY_ATTEMPTS'),
    accountPasswordSend: policy('account.password.send', 5, 10 * 60 as RedisTtlSeconds, 15 * 60 as RedisTtlSeconds, 'above', 'PASSWORD_RESET_SEND_TOO_MANY_REQUESTS'),
    accountRecoveryFailure: policy('account.recovery.failure', 2, 24 * 60 * 60 as RedisTtlSeconds, 24 * 60 * 60 as RedisTtlSeconds, 'atLeast', 'ACCOUNT_RECOVERY_TOO_MANY_ATTEMPTS'),
    accountRecoverySecondFailure: policy('account.recovery.second.failure', 2, 10 * 60 as RedisTtlSeconds, 15 * 60 as RedisTtlSeconds, 'atLeast', 'ACCOUNT_RECOVERY_SECOND_TOO_MANY_ATTEMPTS'),
    mfaFailure: policy('mfa.failure', 5, 10 * 60 as RedisTtlSeconds, 10 * 60 as RedisTtlSeconds, 'atLeast', 'MFA_TOO_MANY_ATTEMPTS'),
    mfaSend: policy('mfa.send', 5, 10 * 60 as RedisTtlSeconds, 10 * 60 as RedisTtlSeconds, 'above', 'MFA_SEND_TOO_MANY_REQUESTS'),
    mfaBackupFailure: policy('mfa.backup.failure', 5, 10 * 60 as RedisTtlSeconds, 15 * 60 as RedisTtlSeconds, 'atLeast', 'MFA_BACKUP_CODE_TOO_MANY_ATTEMPTS'),
    mfaBackupRegeneration: policy('mfa.backup.regeneration', 3, 60 * 60 as RedisTtlSeconds, 60 * 60 as RedisTtlSeconds, 'above', 'MFA_BACKUP_CODE_REGEN_TOO_MANY_REQUESTS'),
    feedbackSend: policy('feedback.send', 8, 10 * 60 as RedisTtlSeconds, 15 * 60 as RedisTtlSeconds, 'atLeast', 'FEEDBACK_TOO_MANY_REQUESTS')
} as const)

export type AtomicAttemptPolicyId = keyof typeof atomicAttemptPolicies

const SCRIPT = `
local lock = redis.call('EXISTS', KEYS[2])
if lock == 1 then return {0, 0, 1} end
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
local threshold = ARGV[3] == 'atLeast' and count >= tonumber(ARGV[2]) or count > tonumber(ARGV[2])
if threshold then
  redis.call('SET', KEYS[2], '1', 'EX', ARGV[4])
  redis.call('DEL', KEYS[1])
  return {0, count, 1}
end
return {1, count, 0}
`

@Injectable()
export class AtomicAttemptPolicyService {
    constructor(private readonly redis: RedisService) {}

    getPolicy(id: AtomicAttemptPolicyId): AtomicAttemptPolicy {
        return atomicAttemptPolicies[id]
    }

    async assertAllowed(id: AtomicAttemptPolicyId, lockKey: RedisKey): Promise<boolean> {
        return !(await this.redis.exists(lockKey))
    }

    async recordFailure(
        id: AtomicAttemptPolicyId,
        counterKey: RedisKey,
        lockKey: RedisKey
    ): Promise<AtomicAttemptResult> {
        return this.execute(id, counterKey, lockKey)
    }

    async recordSend(
        id: AtomicAttemptPolicyId,
        counterKey: RedisKey,
        lockKey: RedisKey
    ): Promise<AtomicAttemptResult> {
        return this.execute(id, counterKey, lockKey)
    }

    async reset(id: AtomicAttemptPolicyId, counterKey: RedisKey, lockKey: RedisKey): Promise<void> {
        if (this.getPolicy(id).resetOnSuccess) {
            await this.redis.del(counterKey)
            await this.redis.del(lockKey)
        }
    }

    private async execute(
        id: AtomicAttemptPolicyId,
        counterKey: RedisKey,
        lockKey: RedisKey
    ): Promise<AtomicAttemptResult> {
        const descriptor = this.getPolicy(id)
        const [allowed, count, locked] = await this.redis.eval<[number, number, number]>(
            SCRIPT,
            [counterKey, lockKey],
            [
                String(descriptor.windowSeconds),
                String(descriptor.limit),
                descriptor.lockWhen,
                String(descriptor.lockSeconds)
            ]
        )
        return { allowed: allowed === 1, count, locked: locked === 1 }
    }
}
