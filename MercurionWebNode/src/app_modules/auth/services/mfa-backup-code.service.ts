import { Injectable } from '@nestjs/common'
import type { UUID } from 'crypto'

import type { BackupCodeStatusDTO } from 'src/app_modules/user/Models/DTO/backup-code-status.dto'
import { MfaApplicationService } from './mfa.service'

/** Backup-code lifecycle port. Persistence remains behind MfaBackupCodeStore. */
@Injectable()
export class MfaBackupCodeService {
    constructor(private readonly application: MfaApplicationService) {}

    getStatus(userId: UUID): Promise<BackupCodeStatusDTO> {
        return this.application.getBackupCodesStatus(userId)
    }

    regenerate(userId: UUID): Promise<string[]> {
        return this.application.regenerateBackupCodes(userId)
    }

    hasValid(userId: UUID): Promise<boolean> {
        return this.application.hasValidBackupCodes(userId)
    }

    destroy(userId: UUID): Promise<void> {
        return this.application.destroyBackupCodes(userId)
    }
}
