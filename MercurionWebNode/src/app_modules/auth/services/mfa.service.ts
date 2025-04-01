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
import { MfaAuthMetadata, TotpMetadata } from '../Models/interfaces/totp-wrapper.interface';
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
import { nullish } from 'src/Models/nullish.type';
import { GeneralUtils } from 'src/general-utils/general-utils';
import { RedisService } from 'src/app_modules/redis/services/redis.service';

@Injectable()
export class MfaService {

    private readonly totpConfig: TotpConfiguration
    private readonly sessionZeroId: UUID
    private readonly appName: string

    constructor(
        private readonly securityService: SercurityService,
        private readonly userService: UserService,
        private readonly passwordEncoderService: PasswordEncoderService,
        @InjectRepository(MfaBackupCode)
        private readonly backupCodeRepository: Repository<MfaBackupCode>,
        private readonly smsService: SmsSenderService,
        private readonly mailService: MailSenderService,
        private readonly configService: ConfigService,
        private readonly jwtTools: JwtToolsService,
        private readonly sessionService: SessionService,
        private readonly redisService: RedisService
    ) {
        this.totpConfig = this.configService.get<TotpConfiguration>('Totp') as TotpConfiguration
        this.sessionZeroId = this.configService.get<UUID>('Session.sessionZeroId') as UUID
        this.appName = this.configService.get<string>("App.globalName") as string
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

    public async sendOtpToUser(preAuthorizationToken: string, strategy: MfaStrategy, phoneNumberToVerify?: string): Promise<TotpMetadata> {

        let userId: UUID
        let jti: UUID
        let sessionId: UUID

        try {
            ({ sub: userId, sid: sessionId, jti } = await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken))
        } catch {
            throw new RpcException('InvalidJwtValidation')
        }
        const user = await this.userService.getUserById(userId)
        if (!user) {
            throw new RpcException('NoSuchUser')
        }
        if (!user.otpSecret) throw new RpcException('OtpSecretNotFound')
        if (!user.mfaStrategies.includes(strategy))
            throw new RpcException(`InvalidMfaStrategy::${strategy} strategy for MFA not enabled for this user`)
        const { TOTP, ...metadata } = this.securityService.generateTotp(user.otpSecret)

        switch (strategy) {

            case MfaStrategy.EMAIL_OTP:

                await this.mailService.sendEmail<EmailTotpContext>(
                    user.email as string,
                    `Il tuo codice per accedere a ${this.appName}`,
                    {
                        firstName: user.firstName,
                        totp: TOTP,
                        period: this.totpConfig.period
                    },
                    join(__dirname, "../../notification/email-templates/send-totp-for-2fa.hbs")

                )
                break

            case MfaStrategy.SMS_OTP:

                if (!await this.sessionService.isDoNotAskMfaPhoneNumberVerification(sessionId) && phoneNumberToVerify !== user.completePhoneNumber) {
                    await this.sessionService.revokeToken(jti)
                    throw new RpcException('NoSuchPhoneNumber')
                }
                await this.smsService.sendSms(
                    user.completePhoneNumber as string,
                    `Ciao ${user.firstName}. Ecco il tuo codice per accedere a ${this.appName}: ${TOTP}\nE' valido per ${this.totpConfig.period} secondi.`
                )
                break
            default:
                throw new RpcException(`UnsupportedMfaStrategy::${strategy}`)

        }

        return metadata
    }

    public async verifyUserOtpOrAppTotp(totp: string, preAuthorizationToken: string, strategy: MfaStrategy): Promise<boolean> {
        const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken)
        await this.sessionService.revokeToken(jti)
        if (!await this.userService.existsUserById(userId)) {
            throw new RpcException('NoSuchUser')
        }
        let otpSecret: string | nullish
        switch (strategy) {
            case MfaStrategy.EMAIL_OTP:
            case MfaStrategy.SMS_OTP:
                otpSecret = await this.userService.getOptSecretByUserId(userId)
                break
            case MfaStrategy.APP_TOTP:
                otpSecret = await this.userService.getAppTotpSecretByUserId(userId)
                break
            default:
                throw new RpcException(`UnsupportedMfaStrategy::${GeneralUtils.getEnumKeyByValue(MfaStrategy, strategy)}`)

        }
        if (!otpSecret) throw new RpcException('OtpSecretNotFound')
        return this.securityService.verifyTotp(totp, otpSecret)
    }

    public async enableMfa_firstStep(userId: UUID, strategy: MfaStrategy): Promise<MfaAuthMetadata> {

        let totpSecret: string | nullish
        let TOTP: string
        let metadata: TotpMetadata = {
            generatedAt: 0,
            expiresAt: 0
        }
        let email: string
        let completePhoneNumber: string
        let otpauth_url: string
        let secureToken: string

        if (!await this.userService.existsUserById(userId)) {
            throw new RpcException('NoSuchUser')
        }
        const firstName = await this.userService.getUserFirstNameById(userId) as string
        if ((await this.userService.getUserEnabledMfaStrategies(userId)).includes(strategy))
            throw new RpcException(`InvalidMfaStrategy::${GeneralUtils.getEnumKeyByValue(MfaStrategy, strategy)} strategy for MFA already enabled for this user`)

        switch (strategy) {
            case MfaStrategy.EMAIL_OTP:

                email = await this.userService.getUserEmailById(userId) as string
                totpSecret = await this.userService.getOptSecretByUserId(userId)
                if (!totpSecret) {
                    throw new RpcException('TotpSecretNotFound')
                }
                ({ TOTP, ...metadata } = this.securityService.generateTotp(totpSecret))
                await this.mailService.sendEmail<EmailTotpContext>(
                    email,
                    `Il tuo codice per attivare l'MFA in ${this.appName}`,
                    {
                        firstName,
                        totp: TOTP,
                        period: this.totpConfig.period
                    },
                    join(__dirname, "../../notification/email-templates/send-totp-to-enable-mfa.hbs")
                )
                secureToken = await this.jwtTools.generateToken(userId, TokenType.EmailOtpMfaActivationToken)
                break

            case MfaStrategy.SMS_OTP:

                completePhoneNumber = await this.userService.getPhoneNumberById(userId) as string
                totpSecret = await this.userService.getOptSecretByUserId(userId)
                if (!totpSecret) {
                    throw new RpcException('TotpSecretNotFound')
                }
                ({ TOTP, ...metadata } = this.securityService.generateTotp(totpSecret))
                await this.smsService.sendSms(completePhoneNumber,
                    `Ciao ${firstName}. Ecco il tuo codice per attivare l'MFA in ${this.appName}: ${TOTP}\nE' valido per ${this.totpConfig.period} secondi.`)
                secureToken = await this.jwtTools.generateToken(userId, TokenType.SmsOtpMfaActivationToken)
                break

            case MfaStrategy.APP_TOTP:

                ({ totpSecret, otpauth_url } = this.securityService.generateAppTotpSecret())
                metadata = {
                    generatedAt: Date.now(),
                    expiresAt: Date.now() + this.totpConfig.period * 1000
                }

                // salvataggio temporaneo del secret in redis (con TTL), associato allo user
                await this.redisService.set(`mfa:temp:app-secret:${userId}`, totpSecret, 300) // 5 minuti
                secureToken = await this.jwtTools.generateToken(userId, TokenType.AppTotpMfaActivationToken)
                return {
                    ...metadata,
                    secret: totpSecret,
                    otpauthUrl: otpauth_url,
                    qrCode: await this.securityService.generateQrCodeDataUrl(otpauth_url),
                    secureToken
                }

        }

        return {
            ...metadata,
            secureToken
        }

    }

    public async enableMfa_secondStep_verifyTotpAndAppendStrategy(
        totp: string,
        secureToken: string,
        strategy: MfaStrategy
    ): Promise<boolean> {

        let tokenType: TokenType

        switch (strategy) {
            case MfaStrategy.EMAIL_OTP:
                tokenType = TokenType.EmailOtpMfaActivationToken
                break
            case MfaStrategy.SMS_OTP:
                tokenType = TokenType.SmsOtpMfaActivationToken
                break
            case MfaStrategy.APP_TOTP:
                tokenType = TokenType.AppTotpMfaActivationToken
                break
            default:
                throw new RpcException(`UnsupportedMfaStrategy::${GeneralUtils.getEnumKeyByValue(MfaStrategy, strategy)}`)
        }

        const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(secureToken, tokenType)
        await this.sessionService.revokeToken(jti.toString())

        if (!await this.userService.existsUserById(userId)) {
            throw new RpcException('NoSuchUser')
        }

        let otpSecret: string | nullish

        if (strategy === MfaStrategy.APP_TOTP) {
            otpSecret = await this.redisService.get(`mfa:temp:app-secret:${userId}`)
            if (!otpSecret) throw new RpcException('TemporaryAppTotpSecretNotFound')

            const isValid = this.securityService.verifyTotp(totp, otpSecret)
            if (!isValid) return false

            await this.userService.updateUser(userId, { appTotpSecret: otpSecret })
            await this.redisService.del(`mfa:temp:app-secret:${userId}`)
        } else {
            otpSecret = await this.userService.getOptSecretByUserId(userId)
            if (!otpSecret) throw new RpcException('OtpSecretNotFound')

            const isValid = this.securityService.verifyTotp(totp, otpSecret)
            if (!isValid) return false
        }

        await this.userService.appendMfaStrategy(userId, strategy)

        return true
    }

    public async disableMfa_firstStep(userId: UUID, strategy: MfaStrategy): Promise<MfaAuthMetadata> {

        let totpSecret: string | nullish
        let TOTP: string
        let metadata: TotpMetadata = {
            generatedAt: 0,
            expiresAt: 0
        }
        let email: string
        let completePhoneNumber: string
        let secureToken: string
        const now = new Date()
        now.setMilliseconds(0)

        if (!await this.userService.existsUserById(userId)) {
            throw new RpcException('NoSuchUser')
        }

        const strategies = await this.userService.getUserEnabledMfaStrategies(userId)
        if (!strategies.includes(strategy)) {
            throw new RpcException(`InvalidMfaStrategy::${strategy} strategy not currently active`)
        }

        const firstName = await this.userService.getUserFirstNameById(userId) as string

        switch (strategy) {
            case MfaStrategy.EMAIL_OTP:
                email = await this.userService.getUserEmailById(userId) as string
                totpSecret = await this.userService.getOptSecretByUserId(userId)
                if (!totpSecret) {
                    throw new RpcException('TotpSecretNotFound')
                }
                ({ TOTP, ...metadata } = this.securityService.generateTotp(totpSecret))

                await this.mailService.sendEmail<EmailTotpContext>(
                    email,
                    `Codice per disattivare l'MFA via email in ${this.appName}`,
                    { firstName, totp: TOTP, period: this.totpConfig.period },
                    join(__dirname, "../../notification/email-templates/send-totp-to-disable-mfa.hbs")
                )
                secureToken = await this.jwtTools.generateToken(userId, TokenType.EmailOtpMfaInactivationToken)
                break

            case MfaStrategy.SMS_OTP:
                completePhoneNumber = await this.userService.getPhoneNumberById(userId) as string
                totpSecret = await this.userService.getOptSecretByUserId(userId)
                if (!totpSecret) {
                    throw new RpcException('TotpSecretNotFound')
                }
                ({ TOTP, ...metadata } = this.securityService.generateTotp(totpSecret))

                await this.smsService.sendSms(
                    completePhoneNumber,
                    `Ciao ${firstName}. Il tuo codice per disattivare l'MFA via SMS è: ${TOTP}\nÈ valido per ${this.totpConfig.period} secondi.`
                )
                secureToken = await this.jwtTools.generateToken(userId, TokenType.SmsOtpMfaInactivationToken)
                break

            case MfaStrategy.APP_TOTP:
                // Nessun codice inviato. Basta generare il token di disattivazione.
                totpSecret = await this.userService.getAppTotpSecretByUserId(userId)
                if (!totpSecret) throw new RpcException('TotpSecretNotFound')
                metadata = {
                    generatedAt: now.getTime(),
                    expiresAt: now.getTime() + this.totpConfig.period * 1000
                }
                secureToken = await this.jwtTools.generateToken(userId, TokenType.AppTotpMfaInactivationToken)
                break

            default:
                throw new RpcException(`UnsupportedMfaStrategy::${GeneralUtils.getEnumKeyByValue(MfaStrategy, strategy)}`)
        }

        return {
            ...metadata,
            secureToken
        }
    }

    public async disableMfa_secondStep_verifyTotpAndRemoveStrategy(
        totp: string,
        secureToken: string,
        strategy: MfaStrategy
    ): Promise<boolean> {

        let tokenType: TokenType

        switch (strategy) {
            case MfaStrategy.EMAIL_OTP:
                tokenType = TokenType.EmailOtpMfaInactivationToken
                break;
            case MfaStrategy.SMS_OTP:
                tokenType = TokenType.SmsOtpMfaInactivationToken
                break;
            case MfaStrategy.APP_TOTP:
                tokenType = TokenType.AppTotpMfaInactivationToken
                break;
            default:
                throw new RpcException(`UnsupportedMfaStrategy::${GeneralUtils.getEnumKeyByValue(MfaStrategy, strategy)}`)
        }

        const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(secureToken, tokenType);
        await this.sessionService.revokeToken(jti.toString())

        if (!await this.userService.existsUserById(userId)) {
            throw new RpcException('NoSuchUser')
        }

        let otpSecret: string | nullish
        if (strategy === MfaStrategy.APP_TOTP) {
            otpSecret = await this.userService.getAppTotpSecretByUserId(userId)
        } else {
            otpSecret = await this.userService.getOptSecretByUserId(userId)
        }

        if (!otpSecret) {
            throw new RpcException('OtpSecretNotFound')
        }

        const isValid = this.securityService.verifyTotp(totp, otpSecret)
        if (!isValid) return false

        await this.userService.removeMfaStrategy(userId, strategy)
        return true
    }



}
