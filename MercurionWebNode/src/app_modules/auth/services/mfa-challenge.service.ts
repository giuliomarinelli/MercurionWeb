import { Injectable } from '@nestjs/common'
import type { UUID } from 'crypto'

import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum'
import type { TotpMetadata } from '../Models/interfaces/totp-wrapper.interface'
import type { MfaPort } from '../Models/interfaces/mfa-strategy.contract'
import { MfaApplicationService } from './mfa.service'

/** Login challenge issuance and verification port. */
@Injectable()
export class MfaChallengeService implements Pick<MfaPort,
    'sendOtpToUser' | 'verifyUserOtpOrAppTotp' | 'verifyBackupCode' |
    'isMfaEnabled' | 'getEnabledMfaStrategies'> {
    constructor(private readonly application: MfaApplicationService) {}

    isMfaEnabled(userId: UUID): Promise<boolean> {
        return this.application.isMfaEnabled(userId)
    }

    getEnabledMfaStrategies(userId: UUID): Promise<MfaStrategy[]> {
        return this.application.getEnabledMfaStrategies(userId)
    }

    sendOtpToUser(token: string, strategy: MfaStrategy, trustVerify: boolean): Promise<TotpMetadata> {
        return this.application.sendOtpToUser(token, strategy, trustVerify)
    }

    verifyUserOtpOrAppTotp(code: string, token: string, strategy: MfaStrategy): Promise<boolean> {
        return this.application.verifyUserOtpOrAppTotp(code, token, strategy)
    }

    verifyBackupCode(code: string, token: string): Promise<boolean> {
        return this.application.verifyBackupCode(code, token)
    }
}
