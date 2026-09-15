import { Injectable } from '@nestjs/common'

import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum'
import type {
    MfaChallengeInput,
    MfaChallengeResult,
    MfaStrategyPort,
    MfaVerificationInput
} from '../Models/interfaces/mfa-strategy.contract'
import { MfaChallengeService } from './mfa-challenge.service'

/**
 * The registry is the exhaustive strategy boundary.  Controllers and auth
 * handlers select a strategy by its discriminant; factor-specific transport
 * concerns stay behind the port.
 */
@Injectable()
export class MfaStrategyRegistry {
    private readonly strategies: ReadonlyMap<MfaStrategy, MfaStrategyPort>

    constructor(private readonly challenges: MfaChallengeService) {
        const otp = (strategy: MfaStrategy): MfaStrategyPort => ({
            strategy,
            issue: (input: MfaChallengeInput) => {
                void input
                return Promise.reject(new Error('Enrollment issuance is owned by MfaEnrollmentService'))
            },
            verify: ({ code, secureToken }: MfaVerificationInput) =>
                this.challenges.verifyUserOtpOrAppTotp(code, secureToken, strategy)
        })
        this.strategies = new Map([
            [MfaStrategy.EMAIL_OTP, otp(MfaStrategy.EMAIL_OTP)],
            [MfaStrategy.SMS_OTP, otp(MfaStrategy.SMS_OTP)],
            [MfaStrategy.APP_TOTP, otp(MfaStrategy.APP_TOTP)],
            [MfaStrategy.BACKUP_CODE, {
                strategy: MfaStrategy.BACKUP_CODE,
                issue: async (input): Promise<MfaChallengeResult> => {
                    void input
                    return Promise.reject(new Error('Backup codes are verification-only challenges'))
                },
                verify: ({ code, secureToken }) =>
                    this.challenges.verifyBackupCode(code, secureToken)
            }]
        ])
    }

    get(strategy: MfaStrategy): MfaStrategyPort {
        const port = this.strategies.get(strategy)
        if (!port) throw new Error(`Unsupported MFA strategy: ${strategy}`)
        return port
    }
}
