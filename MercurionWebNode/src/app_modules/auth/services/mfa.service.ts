import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { SercurityService } from './sercurity.service';
import { UserService } from 'src/app_modules/user/services/user.service';
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { MfaBackupCode } from 'src/app_modules/user/Models/entities/backup-code.entity';
import { Repository } from 'typeorm';
import { PasswordEncoderService } from './password-encoder.service';
import { User } from 'src/app_modules/user/Models/entities/user.entity';
import { BackupCodeStatusDTO } from 'src/app_modules/user/Models/DTO/backup-code-status.dto';

@Injectable()
export class MfaService {

    constructor(
        private readonly securityService: SercurityService,
        private readonly userService: UserService,
        private readonly passwordEncoderService: PasswordEncoderService,
        @InjectRepository(MfaBackupCode) private readonly backupCodeRepository: Repository<MfaBackupCode>
    ) { }

    public async isMfaEnabled(userId: UUID): Promise<boolean> {
        return !!(await this.userService.getUserEnabledMfaStrategies(userId)).length
    }

    public async getEnabledMfaStrategies(userId: UUID): Promise<MfaStrategy[]> {
        return await this.userService.getUserEnabledMfaStrategies(userId)
    }

    public async generateBackupCodes(userId: UUID): Promise<string[]> {
        const codes = Array.from({ length: 10 }).map(() => this.securityService.generateReadableCode())

        const entities = await Promise.all(codes.map(async code => ({
            hash: await this.passwordEncoderService.encode(code),
            used: false,
            createdAt: Date.now(),
            user: { id: userId } as Pick<User, 'id'>
        })))

        await this.backupCodeRepository.save(entities)
        return codes
    }

    public async verifyBackupCode(userId: UUID, plainCode: string): Promise<boolean> {

        const codes = await this.backupCodeRepository.find({ where: { user: { id: userId }, used: false } })

        for (const c of codes) {
            const match = await this.passwordEncoderService.compare(plainCode, c.hash)
            if (match) {
                c.used = true
                c.usedAt = Date.now()
                await this.backupCodeRepository.save(c)
                return true
            }
        }
        return false
    }

    public async regenerateBackupCodes(userId: UUID): Promise<string[]> {
        await this.backupCodeRepository.delete({ user: { id: userId } })
        return await this.generateBackupCodes(userId)
    }

    public async hasValidBackupCodes(userId: UUID): Promise<boolean> {
        const count = await this.backupCodeRepository.count({ where: { user: { id: userId }, used: false } })
        return count > 0
    }

    public async getBackupCodesStatus(userId: UUID): Promise<BackupCodeStatusDTO> {
        const codes = await this.backupCodeRepository.find({ where: { user: { id: userId } } });
        const used = codes.filter(c => c.used).length;
        return {
            total: codes.length,
            used,
            remaining: codes.length - used
        }
    }

    






}
