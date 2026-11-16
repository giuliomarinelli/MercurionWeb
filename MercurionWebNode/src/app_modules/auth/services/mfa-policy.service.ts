import { Injectable } from '@nestjs/common'
import type { UUID } from 'crypto'

import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { redisKeys } from 'src/app_modules/redis/contracts/redis-contracts'
import { AtomicAttemptPolicyService } from 'src/app_modules/redis/services/atomic-attempt-policy.service'
import { MfaStrategy } from 'src/app_modules/user/models/enums/mfa-strategy.enum'
import { MfaContext } from '../models/enums/mfa-context.enum'

@Injectable()
export class MfaPolicyService {
    constructor(
        private readonly attempts: AtomicAttemptPolicyService
    ) {}

    async ensureNotLocked(userId: UUID, strategy: MfaStrategy, context = MfaContext.VERIFY): Promise<void> {
        if (!await this.attempts.assertAllowed('mfaFailure', redisKeys.mfa.lock(context, userId, strategy))) {
            throw applicationError(ApplicationErrorCode.MFA_TOO_MANY_ATTEMPTS)
        }
    }

    async registerFailure(userId: UUID, strategy: MfaStrategy, context = MfaContext.VERIFY): Promise<void> {
        await this.attempts.recordFailure(
            'mfaFailure',
            redisKeys.mfa.failure(context, userId, strategy),
            redisKeys.mfa.lock(context, userId, strategy)
        )
    }

    async clearFailures(userId: UUID, strategy: MfaStrategy, context: MfaContext): Promise<void> {
        await this.attempts.reset(
            'mfaFailure',
            redisKeys.mfa.failure(context, userId, strategy),
            redisKeys.mfa.lock(context, userId, strategy)
        )
    }

    async throttleSend(userId: UUID, strategy: MfaStrategy, context = MfaContext.SEND): Promise<void> {
        const lockKey = redisKeys.mfa.sendLock(context, userId, strategy)
        if (!await this.attempts.assertAllowed('mfaSend', lockKey)) {
            throw applicationError(ApplicationErrorCode.MFA_SEND_TOO_MANY_REQUESTS)
        }
        const result = await this.attempts.recordSend(
            'mfaSend',
            redisKeys.mfa.send(context, userId, strategy),
            lockKey
        )
        if (!result.allowed) {
            throw applicationError(ApplicationErrorCode.MFA_SEND_TOO_MANY_REQUESTS)
        }
    }

    async ensureBackupNotLocked(userId: UUID): Promise<void> {
        if (!await this.attempts.assertAllowed('mfaBackupFailure', redisKeys.mfa.backupLock(userId))) {
            throw applicationError(ApplicationErrorCode.MFA_BACKUP_CODE_TOO_MANY_ATTEMPTS)
        }
    }

    async registerBackupFailure(userId: UUID): Promise<void> {
        await this.attempts.recordFailure(
            'mfaBackupFailure',
            redisKeys.mfa.backupFailure(userId),
            redisKeys.mfa.backupLock(userId)
        )
    }

    async clearBackupFailures(userId: UUID): Promise<void> {
        await this.attempts.reset(
            'mfaBackupFailure',
            redisKeys.mfa.backupFailure(userId),
            redisKeys.mfa.backupLock(userId)
        )
    }

    async throttleBackupRegeneration(userId: UUID): Promise<void> {
        const lockKey = redisKeys.mfa.backupRegenerationLock(userId)
        if (!await this.attempts.assertAllowed('mfaBackupRegeneration', lockKey)) {
            throw applicationError(ApplicationErrorCode.MFA_BACKUP_CODE_REGEN_TOO_MANY_REQUESTS)
        }
        const result = await this.attempts.recordSend(
            'mfaBackupRegeneration',
            redisKeys.mfa.backupRegeneration(userId),
            lockKey
        )
        if (!result.allowed) {
            throw applicationError(ApplicationErrorCode.MFA_BACKUP_CODE_REGEN_TOO_MANY_REQUESTS)
        }
    }
}
