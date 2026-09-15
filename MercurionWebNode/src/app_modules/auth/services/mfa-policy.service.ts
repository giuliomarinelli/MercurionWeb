import { Injectable } from '@nestjs/common'
import type { UUID } from 'crypto'

import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { redisDurations, redisKeys } from 'src/app_modules/redis/contracts/redis-contracts'
import { RedisService } from 'src/app_modules/redis/services/redis.service'
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum'
import { MfaContext } from '../Models/enums/mfa-context.enum'

@Injectable()
export class MfaPolicyService {
    private readonly failWindowSeconds = 10 * 60
    private readonly lockSeconds = 10 * 60
    private readonly maxFailures = 5
    private readonly sendWindowSeconds = 10 * 60
    private readonly maxSends = 5

    private readonly backupFailWindowSeconds = 10 * 60
    private readonly backupLockSeconds = 15 * 60
    private readonly backupMaxFailures = 5
    private readonly backupRegenWindowSeconds = 60 * 60
    private readonly backupRegenMaxRequests = 3

    constructor(private readonly redis: RedisService) {}

    async ensureNotLocked(userId: UUID, strategy: MfaStrategy, context = MfaContext.VERIFY): Promise<void> {
        if (await this.redis.exists(redisKeys.mfa.lock(context, userId, strategy))) {
            throw applicationError(ApplicationErrorCode.MFA_TOO_MANY_ATTEMPTS)
        }
    }

    async registerFailure(userId: UUID, strategy: MfaStrategy, context = MfaContext.VERIFY): Promise<void> {
        const key = redisKeys.mfa.failure(context, userId, strategy)
        const count = await this.redis.incr(key)
        if (count === 1) await this.redis.setTTL(key, redisDurations.seconds(this.failWindowSeconds))
        if (count >= this.maxFailures) {
            await this.redis.set(redisKeys.mfa.lock(context, userId, strategy), '1', redisDurations.seconds(this.lockSeconds))
            await this.redis.del(key)
        }
    }

    async clearFailures(userId: UUID, strategy: MfaStrategy, context: MfaContext): Promise<void> {
        await this.redis.del(redisKeys.mfa.failure(context, userId, strategy))
        await this.redis.del(redisKeys.mfa.lock(context, userId, strategy))
    }

    async throttleSend(userId: UUID, strategy: MfaStrategy, context = MfaContext.SEND): Promise<void> {
        const lockKey = redisKeys.mfa.sendLock(context, userId, strategy)
        if (await this.redis.exists(lockKey)) {
            throw applicationError(ApplicationErrorCode.MFA_SEND_TOO_MANY_REQUESTS)
        }
        const key = redisKeys.mfa.send(context, userId, strategy)
        const count = await this.redis.incr(key)
        if (count === 1) await this.redis.setTTL(key, redisDurations.seconds(this.sendWindowSeconds))
        if (count > this.maxSends) {
            await this.redis.set(lockKey, '1', redisDurations.minutes(10))
            throw applicationError(ApplicationErrorCode.MFA_SEND_TOO_MANY_REQUESTS)
        }
    }

    async ensureBackupNotLocked(userId: UUID): Promise<void> {
        if (await this.redis.exists(redisKeys.mfa.backupLock(userId))) {
            throw applicationError(ApplicationErrorCode.MFA_BACKUP_CODE_TOO_MANY_ATTEMPTS)
        }
    }

    async registerBackupFailure(userId: UUID): Promise<void> {
        const key = redisKeys.mfa.backupFailure(userId)
        const count = await this.redis.incr(key)
        if (count === 1) await this.redis.setTTL(key, redisDurations.seconds(this.backupFailWindowSeconds))
        if (count >= this.backupMaxFailures) {
            await this.redis.set(redisKeys.mfa.backupLock(userId), '1', redisDurations.seconds(this.backupLockSeconds))
            await this.redis.del(key)
        }
    }

    async clearBackupFailures(userId: UUID): Promise<void> {
        await this.redis.del(redisKeys.mfa.backupFailure(userId))
        await this.redis.del(redisKeys.mfa.backupLock(userId))
    }

    async throttleBackupRegeneration(userId: UUID): Promise<void> {
        const lockKey = redisKeys.mfa.backupRegenerationLock(userId)
        if (await this.redis.exists(lockKey)) {
            throw applicationError(ApplicationErrorCode.MFA_BACKUP_CODE_REGEN_TOO_MANY_REQUESTS)
        }
        const key = redisKeys.mfa.backupRegeneration(userId)
        const count = await this.redis.incr(key)
        if (count === 1) await this.redis.setTTL(key, redisDurations.seconds(this.backupRegenWindowSeconds))
        if (count > this.backupRegenMaxRequests) {
            await this.redis.set(lockKey, '1', redisDurations.seconds(this.backupRegenWindowSeconds))
            throw applicationError(ApplicationErrorCode.MFA_BACKUP_CODE_REGEN_TOO_MANY_REQUESTS)
        }
    }
}
