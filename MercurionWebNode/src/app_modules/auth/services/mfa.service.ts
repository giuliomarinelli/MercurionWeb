import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { SercurityService } from './sercurity.service';
import { UserService } from 'src/app_modules/user/services/user.service';
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { MfaBackupCode } from 'src/app_modules/user/Models/entities/backup-code.entity';
import { Repository } from 'typeorm';

@Injectable()
export class MfaService {

    constructor(
        private securityService: SercurityService,
        private userService: UserService,
        @InjectRepository(MfaBackupCode) private readonly backupCodeRepository: Repository<MfaBackupCode>
    ) { }

    public async isMfaEnabled(userId: UUID): Promise<boolean> {
        return !!(await this.userService.getUserEnabledMfaStrategies(userId)).length
    }

    public async getEnabledMfaStrategies(userId: UUID): Promise<MfaStrategy[]> {
        return await this.userService.getUserEnabledMfaStrategies(userId)
    }

}
