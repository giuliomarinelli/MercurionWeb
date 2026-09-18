import { Injectable } from '@nestjs/common'
import type { UUID } from 'crypto'

import { MfaStrategy } from 'src/app_modules/user/models/enums/mfa-strategy.enum'
import type { MfaAuthMetadata } from '../models/interfaces/totp-wrapper.interface'
import { MfaApplicationService } from './mfa.service'

/** Owns MFA enrollment and inactivation; it does not participate in login. */
@Injectable()
export class MfaEnrollmentService {
    constructor(private readonly application: MfaApplicationService) {}

    enableFirstStep(userId: UUID, strategy: MfaStrategy): Promise<MfaAuthMetadata> {
        return this.application.enableMfa_firstStep(userId, strategy)
    }

    enableSecondStep(totp: string, token: string, strategy: MfaStrategy): Promise<boolean> {
        return this.application.enableMfa_secondStep_verifyTotpAndAppendStrategy(totp, token, strategy)
    }

    disableFirstStep(userId: UUID, strategy: MfaStrategy): Promise<MfaAuthMetadata> {
        return this.application.disableMfa_firstStep(userId, strategy)
    }

    disableSecondStep(totp: string, token: string, strategy: MfaStrategy): Promise<boolean> {
        return this.application.disableMfa_secondStep_verifyTotpAndRemoveStrategy(totp, token, strategy)
    }
}
