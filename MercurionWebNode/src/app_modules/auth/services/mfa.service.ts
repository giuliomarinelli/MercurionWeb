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
import { TotpMetadata } from '../Models/interfaces/totp-wrapper.interface';
import { SmsSenderService } from 'src/app_modules/notification/services/sms-sender/sms-sender.service';
import { MailSenderService } from 'src/app_modules/notification/services/mail-sender/mail-sender.service';
import { ConfigService } from '@nestjs/config';
import { TokenType } from '../Models/enums/token-type.enum';
import { RpcException } from '@nestjs/microservices';
import { JwtToolsService } from './jwt-tools.service';
import { EmailTotpContext } from 'src/app_modules/notification/Models/contexts/email-totp.context';
import { TotpConfiguration } from 'src/config/@types-config';
import { join } from 'path';
import { SessionService } from './session.service';

@Injectable()
export class MfaService {

    private readonly totpConfig: TotpConfiguration

    constructor(
        private readonly securityService: SercurityService,
        private readonly userService: UserService,
        private readonly passwordEncoderService: PasswordEncoderService,
        @InjectRepository(MfaBackupCode) private readonly backupCodeRepository: Repository<MfaBackupCode>,
        private readonly smsService: SmsSenderService,
        private readonly mailService: MailSenderService,
        private readonly configService: ConfigService,
        private readonly jwtTools: JwtToolsService,
        private readonly sessionService: SessionService
    ) {
        this.totpConfig = this.configService.get<TotpConfiguration>('Totp') as TotpConfiguration
    }

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

    public async sendOtpToUser(preAuthorizationToken: string, strategy: MfaStrategy, sessionId: UUID, phoneNumberToVerify?: string): Promise<TotpMetadata> {

        let userId: UUID

        const appName: string = this.configService.get<string>("App.globalName") as string

        try {
            userId = (await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken)).sub
        } catch {
            throw new RpcException('InvalidJwtValidation')
        }

        const user = await this.userService.getUserById(userId)
        if (!user) {
            throw new RpcException('NoSuchUser')
        }

        if (!user.mfaStrategies.includes(strategy))
            throw new RpcException(`InvalidMfaStrategy::${strategy} strategy for MFA not enabled for this user`)

        const { TOTP, ...metadata } = this.securityService.generateTotp(user.otpSecret)

        switch (strategy) {

            case MfaStrategy.EMAIL_OTP:

                await this.mailService.sendEmail<EmailTotpContext>(
                    user.email as string,
                    `Il tuo codice per accedere a ${appName}`,
                    {
                        firstName: user.firstName,
                        totp: TOTP,
                        period: this.totpConfig.period
                    },
                    join(__dirname, "../../notification/email-templates/send-totp-for-2fa.hbs")

                )
                break

            case MfaStrategy.SMS_OTP:

                if (await this.sessionService.)

                if (contact !== user.completePhoneNumber) {
                    await this.jwtUtils.revokeToken(preAuthorizationToken, TokenType.PreAuthorizationToken)
                    throw new NoSuchPhoneNumberException()
                }
                await this.smsService.sendSms(
                    user.completePhoneNumber,
                    `Ciao ${user.firstName}. Ecco il tuo codice per accedere a ${appName}: ${TOTP}                 
E' vallido per ${this.totpConfig.period} secondi.`
                )

        }

        return metadata
    }








}
