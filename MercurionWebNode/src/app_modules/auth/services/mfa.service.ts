import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { SercurityService } from './sercurity.service';
import { UserService } from 'src/app_modules/user/services/user.service';
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { MfaBackupCode } from 'src/app_modules/user/Models/entities/backup-code.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
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
import { TotpConfiguration } from 'src/config/config.types';
import { join } from 'path';
import { SessionService } from './session.service';
import { nullish } from 'src/Models/nullish.type';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { MfaContext } from '../Models/enums/mfa-context.enum';
import { uuidv7 } from '@kripod/uuidv7';
import { SecurityAuditService } from 'src/app_modules/meilisearch/services/security-audit.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { TypeGuards } from 'src/utils/type-guards/type-guards';

@Injectable()
export class MfaService {

    private readonly logger: MeiliContextLogger

    private readonly totpConfig: TotpConfiguration
    private readonly appName: string

    private readonly MFA_FAIL_WINDOW_SECONDS = 10 * 60
    private readonly MFA_LOCK_SECONDS = 10 * 60
    private readonly MFA_MAX_FAILS = 5

    private readonly MFA_SEND_WINDOW_SECONDS = 10 * 60
    private readonly MFA_MAX_SENDS = 5

    private readonly BACKUP_FAIL_WINDOW_SECONDS = 10 * 60    // 10 minuti
    private readonly BACKUP_MAX_FAILS = 5                    // 5 tentativi
    private readonly BACKUP_LOCK_SECONDS = 15 * 60           // 15 minuti

    // backup codes: rigenerazione
    private readonly BACKUP_REGEN_WINDOW_SECONDS = 60 * 60   // 1 ora
    private readonly BACKUP_REGEN_MAX_REQUESTS = 3           // max 3 rigenerazioni/ora

    constructor(
        @InjectRepository(MfaBackupCode)
        private readonly backupCodeRepository: Repository<MfaBackupCode>,
        private readonly dataSource: DataSource,
        private readonly passwordEncoderService: PasswordEncoderService,
        private readonly securityService: SercurityService,
        private readonly userService: UserService,
        private readonly smsService: SmsSenderService,
        private readonly mailService: MailSenderService,
        private readonly configService: ConfigService,
        private readonly jwtTools: JwtToolsService,
        private readonly sessionService: SessionService,
        private readonly redisService: RedisService,
        private readonly securityAuditService: SecurityAuditService,
        meiliLogger: MeiliLoggerService
    ) {
        this.logger = meiliLogger.forContext(MfaService.name)
        this.totpConfig = this.configService.get<TotpConfiguration>('Totp') as TotpConfiguration
        this.appName = this.configService.get<string>("App.globalName") as string
    }

    public async isMfaEnabled(userId: UUID): Promise<boolean> {
        return !!(await this.userService.getUserEncryptedEnabledMfaStrategies(userId)).length
    }

    public async getEnabledMfaStrategies(userId: UUID): Promise<MfaStrategy[]> {
        return (await this.userService.getUserEncryptedEnabledMfaStrategies(userId))
            .map((s) => this.securityService.decrypt_AES256(s) as MfaStrategy)
    }

    private getBackupFailKey(userId: UUID): string {
        return `mfa:backup:fail:${userId}`
    }

    private getBackupLockKey(userId: UUID): string {
        return `mfa:backup:lock:${userId}`
    }

    private getBackupRegenKey(userId: UUID): string {
        return `mfa:backup:regen:${userId}`
    }

    private getBackupRegenLockKey(userId: UUID): string {
        return `mfa:backup:regen:lock:${userId}`
    }

    private async ensureBackupNotLocked(userId: UUID): Promise<void> {
        const lockKey = this.getBackupLockKey(userId)
        const locked = await this.redisService.exists(lockKey)
        if (locked) {
            throw new RpcException('BackupCode::TooManyAttempts')
        }
    }

    private async registerBackupFailure(userId: UUID): Promise<void> {
        const failKey = this.getBackupFailKey(userId)
        const lockKey = this.getBackupLockKey(userId)

        const fails = await this.redisService.getClient().incr(failKey)

        if (fails === 1) {
            await this.redisService.setTTL(failKey, this.BACKUP_FAIL_WINDOW_SECONDS)
        }

        if (fails >= this.BACKUP_MAX_FAILS) {
            await this.redisService.set(lockKey, '1', this.BACKUP_LOCK_SECONDS)
            await this.redisService.del(failKey)
        }
    }

    private async clearBackupFailures(userId: UUID): Promise<void> {
        const failKey = this.getBackupFailKey(userId)
        const lockKey = this.getBackupLockKey(userId)
        await this.redisService.del(failKey)
        await this.redisService.del(lockKey)
    }

    private async throttleBackupRegeneration(userId: UUID): Promise<void> {
        const countKey = this.getBackupRegenKey(userId)
        const lockKey = this.getBackupRegenLockKey(userId)

        const locked = await this.redisService.exists(lockKey)
        if (locked) {
            throw new RpcException('BackupCodeRegen::TooManyRequests')
        }

        const cnt = await this.redisService.getClient().incr(countKey)
        if (cnt === 1) {
            await this.redisService.setTTL(countKey, this.BACKUP_REGEN_WINDOW_SECONDS)
        }

        if (cnt > this.BACKUP_REGEN_MAX_REQUESTS) {
            await this.redisService.set(lockKey, '1', this.BACKUP_REGEN_WINDOW_SECONDS)
            throw new RpcException('BackupCodeRegen::TooManyRequests')
        }
    }


    public async generateBackupCodes(userId: UUID, manager: EntityManager): Promise<string[]> {

        const codes = Array.from({ length: 10 }).map(() => this.securityService.generateReadableCode())

        const entities = await Promise.all(
            codes.map(async plain => ({
                id: uuidv7() as UUID,
                hash: await this.passwordEncoderService.encode(plain),
                used: false,
                createdAt: Date.now(),
                user: { id: userId } as Pick<User, "id">,
            }))
        )

        await manager.save(MfaBackupCode, entities)

        const row = await manager.findOne(User, {
            where: { id: userId },
            select: { mfaStrategies: true },
        });

        if (!row) {
            throw new RpcException("Unauthenticated")
        }

        let deserialized: string[]
        try {
            deserialized = JSON.parse(row.mfaStrategies || "[]") as string[]
            if (!Array.isArray(deserialized)) {
                deserialized = []
            }
        } catch (e) {
            this.logger.warn(
                `User.mfaStrategies json array deserialization error, userId=${userId}: `,
                (e.stack ?? e) as object
            )
            deserialized = []
        }

        if (deserialized.length === 0) {
            return []
        }

        let decrypted = deserialized
            .map(enc => this.securityService.decrypt_AES256(enc))
            .filter((st) => TypeGuards.isMfaStrategy(st))

        decrypted.push(MfaStrategy.BACKUP_CODE)
        decrypted = GeneralUtils.distinctArray(decrypted)

        const encrypted = decrypted.map(dec => this.securityService.encrypt_AES256(dec))
        await manager.update(
            User,
            { id: userId },
            { mfaStrategies: JSON.stringify(encrypted) }
        )

        return codes
    }


    public async verifyBackupCode(plainCode: string, preAuthorizationToken: string): Promise<boolean> {

        let userId: string = ''
        let jti: string = ''

        try {

            ({ sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken))

            await this.sessionService.revokeToken(jti)

            await this.ensureBackupNotLocked(userId as UUID)

            const codes = await this.backupCodeRepository.find({
                where: {
                    userId: userId as UUID,
                    used: false
                }
            })

            if (!codes || !codes.length) {
                await this.registerBackupFailure(userId as UUID)
                return false
            }

            let matched = false
            for (const c of codes) {
                const match = (await this.passwordEncoderService.compare(plainCode, c.hash))
                if (match) {
                    matched = true
                    c.used = true
                    c.usedAt = Date.now()
                    await this.backupCodeRepository.save(c)
                    break
                }
            }

            if (!matched) {
                await this.registerBackupFailure(userId as UUID)
                return false
            }

            await this.clearBackupFailures(userId as UUID)
            return true
        } catch (e) {
            const logData: string[] = []
            logData.push(userId ? `user_id=${userId}` : '', jti ? `pre_authorization_token_jti=${jti}` : '')
            const logDataStr = logData.length ? ', ' + logData.join(', ') : ''
            this.logger.warn(` > verifyBackupCode${logDataStr} > Error: `, (e.stack ?? e) as object)
            return false
        }
    }


    public async regenerateBackupCodes(userId: UUID): Promise<string[]> {

        await this.throttleBackupRegeneration(userId)

        return this.dataSource.manager.transaction(async (manager) => {

            await manager.delete(MfaBackupCode, { userId })

            const row = await manager.findOne(User, {
                where: { id: userId },
                select: { mfaStrategies: true }
            })

            if (!row) {
                throw new RpcException("Unauthenticated")
            }

            let deserialized: string[] = []
            try {
                deserialized = JSON.parse(row.mfaStrategies || "[]") as string[]
                if (!Array.isArray(deserialized)) deserialized = []
            } catch (e) {
                this.logger.warn(
                    ` > regenerateBackupCodes: error in MFA Strategies deserialization, userId=${userId}: `,
                    (e.stack ?? e) as object
                );
                deserialized = []
            }

            let decrypted = deserialized
                .map(enc => this.securityService.decrypt_AES256(enc))
                .filter((st) => TypeGuards.isMfaStrategy(st))

            decrypted.push(MfaStrategy.BACKUP_CODE)
            decrypted = GeneralUtils.distinctArray(decrypted)

            const encrypted = decrypted.map(dec => this.securityService.encrypt_AES256(dec))
            await manager.update(
                User,
                { id: userId },
                { mfaStrategies: JSON.stringify(encrypted) }
            )

            return this.generateBackupCodes(userId, manager)
        })
    }



    public async hasValidBackupCodes(userId: UUID): Promise<boolean> {
        const count = await this.backupCodeRepository.count({ where: { user: { id: userId }, used: false } })
        return count > 0
    }

    public async getBackupCodesStatus(userId: UUID): Promise<BackupCodeStatusDTO> {
        const codes = await this.backupCodeRepository.find({ where: { user: { id: userId } } })
        const used = codes.filter(c => c.used).length
        return {
            total: codes.length,
            used,
            remaining: codes.length - used
        }
    }

    public async destroyBackupCodes(userId: UUID): Promise<void> {
        await this.backupCodeRepository.delete({ userId })
    }

    private getMfaFailKey(userId: UUID, strategy: MfaStrategy, context: MfaContext = MfaContext.VERIFY): string {
        return `mfa:fail:${context}:${userId}:${strategy}`;
    }

    private getMfaLockKey(userId: UUID, strategy: MfaStrategy, context: MfaContext = MfaContext.VERIFY): string {
        return `mfa:lock:${context}:${userId}:${strategy}`;
    }

    private getMfaSendKey(userId: UUID, strategy: MfaStrategy, context: MfaContext = MfaContext.SEND): string {
        return `mfa:${context}:${userId}:${strategy}`
    }

    private getMfaSendLockKey(userId: UUID, strategy: MfaStrategy, context: MfaContext = MfaContext.SEND): string {
        return `mfa:${context}:lock:${userId}:${strategy}`
    }

    private async ensureMfaNotLocked(userId: UUID, strategy: MfaStrategy, context: MfaContext = MfaContext.VERIFY): Promise<void> {
        const lockKey = this.getMfaLockKey(userId, strategy, context)
        const locked = await this.redisService.exists(lockKey)
        if (locked) {
            throw new RpcException('Mfa::TooManyAttempts')
        }
    }

    private async registerMfaFailure(userId: UUID, strategy: MfaStrategy, context: MfaContext = MfaContext.VERIFY): Promise<void> {
        const failKey = this.getMfaFailKey(userId, strategy, context)
        const lockKey = this.getMfaLockKey(userId, strategy, context)

        const fails = await this.redisService.getClient().incr(failKey)

        if (fails === 1) {
            await this.redisService.setTTL(failKey, this.MFA_FAIL_WINDOW_SECONDS)
        }

        if (fails >= this.MFA_MAX_FAILS) {
            await this.redisService.set(lockKey, '1', this.MFA_LOCK_SECONDS)
            await this.redisService.del(failKey)
        }
    }

    private async clearMfaFailures(userId: UUID, strategy: MfaStrategy, context: MfaContext,): Promise<void> {
        const failKey = this.getMfaFailKey(userId, strategy, context)
        const lockKey = this.getMfaLockKey(userId, strategy, context)
        await this.redisService.del(failKey)
        await this.redisService.del(lockKey)
    }


    private async throttleMfaSend(userId: UUID, strategy: MfaStrategy, context: MfaContext = MfaContext.SEND): Promise<void> {

        const countKey = this.getMfaSendKey(userId, strategy, context)
        const lockKey = this.getMfaSendLockKey(userId, strategy, context)

        const locked = await this.redisService.exists(lockKey)
        if (locked) {
            throw new RpcException('MfaSend::TooManyRequests')
        }

        const cnt = await this.redisService.getClient().incr(countKey)
        if (cnt === 1) {
            await this.redisService.setTTL(countKey, this.MFA_SEND_WINDOW_SECONDS)
        }

        if (cnt > this.MFA_MAX_SENDS) {
            await this.redisService.set(lockKey, '1', 10 * 60)
            throw new RpcException('MfaSend::TooManyRequests')
        }
    }


    public async sendOtpToUser(preAuthorizationToken: string, strategy: MfaStrategy, trustVerify: boolean, phoneNumberToVerify?: string): Promise<TotpMetadata> {

        let userId: UUID
        let jti: UUID

        try {
            ({ sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken))
        } catch {
            throw new RpcException('InvalidJwtValidation')
        }
        await this.throttleMfaSend(userId, strategy, MfaContext.SEND)
        const user = await this.userService.getUserById(userId)
        if (!user) {
            throw new RpcException('NoSuchUser')
        }
        if (!user.otpSecret) throw new RpcException('OtpSecretNotFound')
        let strategyError: boolean = true
        if ((await this.userService.getUserEncryptedEnabledMfaStrategies(userId)).map((enc) => this.securityService.decrypt_AES256(enc)).includes(strategy)) {
            strategyError = false
        } else if (strategy === MfaStrategy.EMAIL_OTP && trustVerify) {
            strategyError = false
        }
        if (strategyError) {
            throw new RpcException(`InvalidMfaStrategy::${GeneralUtils.getEnumKeyByValue(MfaStrategy, strategy)} strategy for MFA not enabled for this user`)
        }
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

                if (phoneNumberToVerify !== user.completePhoneNumber) {
                    await this.sessionService.revokeToken(jti)
                    throw new RpcException('NoSuchPhoneNumber')
                }
                await this.smsService.sendSms(
                    user.completePhoneNumber,
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
        const context = MfaContext.VERIFY
        await this.ensureMfaNotLocked(userId, strategy, context)
        if (!await this.userService.existsUserById(userId)) {
            throw new RpcException('NoSuchUser')
        }
        let otpSecret: string | nullish
        switch (strategy) {
            case MfaStrategy.EMAIL_OTP:
            case MfaStrategy.SMS_OTP:
                otpSecret = await this.userService.getOtpSecretByUserId(userId)
                break
            case MfaStrategy.APP_TOTP:
                otpSecret = await this.userService.getAppTotpSecretByUserId(userId)
                break
            default:
                throw new RpcException(`UnsupportedMfaStrategy::${GeneralUtils.getEnumKeyByValue(MfaStrategy, strategy)}`)

        }
        if (!otpSecret) {
            throw new RpcException('OtpSecretNotFound')
        }
        const ok = this.securityService.verifyTotp(totp, otpSecret, strategy === MfaStrategy.APP_TOTP)
        if (!ok) {
            await this.registerMfaFailure(userId, strategy, context)
            return false
        }
        await this.clearMfaFailures(userId, strategy, context)
        return true
    }

    public async enableMfa_firstStep(userId: UUID, strategy: MfaStrategy): Promise<MfaAuthMetadata> {

        await this.throttleMfaSend(userId, strategy, MfaContext.ENABLE_SEND)

        let totpSecret: string | nullish
        let TOTP: string
        let metadata: TotpMetadata = {
            generatedAt: 0,
            expiresAt: 0
        }
        let email: string
        let completePhoneNumber: string
        let otpauth_url: string
        let secureToken: string = ''

        if (!await this.userService.existsUserById(userId)) {
            throw new RpcException('NoSuchUser')
        }
        const firstName = await this.userService.getUserFirstNameById(userId) as string
        if ((await this.userService.getUserEncryptedEnabledMfaStrategies(userId)).includes(strategy))
            throw new RpcException(`InvalidMfaStrategy::${GeneralUtils.getEnumKeyByValue(MfaStrategy, strategy)} strategy for MFA already enabled for this user`)

        switch (strategy) {
            case MfaStrategy.EMAIL_OTP:

                email = await this.userService.getUserEmailById(userId) as string
                totpSecret = await this.userService.getOtpSecretByUserId(userId)
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
                totpSecret = await this.userService.getOtpSecretByUserId(userId)
                if (!totpSecret) {
                    throw new RpcException('TotpSecretNotFound')
                }
                ({ TOTP, ...metadata } = this.securityService.generateTotp(totpSecret))
                await this.smsService.sendSms(completePhoneNumber,
                    `Ciao ${firstName}. Ecco il tuo codice per attivare l'MFA in ${this.appName}: ${TOTP}\nE' valido per ${this.totpConfig.period} secondi.`)
                secureToken = await this.jwtTools.generateToken(userId, TokenType.SmsOtpMfaActivationToken)
                break

            case MfaStrategy.APP_TOTP:

                email = await this.userService.getUserEmailById(userId) as string
                ({ totpSecret, otpauth_url } = this.securityService.generateAppTotpSecret(email))
                metadata = {
                    generatedAt: Date.now(),
                    expiresAt: Date.now() + this.totpConfig.period * 1000
                }

                // salvataggio temporaneo del secret in redis (con TTL), associato allo user
                await this.redisService.set(`mfa:temp:app-secret:${userId}`, totpSecret, 300) // 5 minuti
                secureToken = await this.jwtTools.generateToken(userId, TokenType.AppTotpMfaActivationToken)
                await this.clearMfaFailures(userId, strategy, MfaContext.ENABLE_SEND)
                return {
                    ...metadata,
                    secret: totpSecret,
                    otpauthUrl: otpauth_url,
                    qrCode: await this.securityService.generateQrCodeDataUrl(otpauth_url),
                    secureToken
                }

        }

        await this.clearMfaFailures(userId, strategy, MfaContext.ENABLE_SEND)

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

        const context = MfaContext.ENABLE_VERIFY
        await this.ensureMfaNotLocked(userId, strategy, context)

        let otpSecret: string | nullish

        if (strategy === MfaStrategy.APP_TOTP) {
            otpSecret = await this.redisService.get(`mfa:temp:app-secret:${userId}`)
            if (!otpSecret) throw new RpcException('TemporaryAppTotpSecretNotFound')

            const isValid = this.securityService.verifyTotp(totp, otpSecret, true)
            if (!isValid) {
                await this.registerMfaFailure(userId, strategy, context)
                return false
            }

            await this.userService.updateUser(userId, { appTotpSecret: otpSecret })
            await this.redisService.del(`mfa:temp:app-secret:${userId}`)
        } else {
            otpSecret = await this.userService.getOtpSecretByUserId(userId)
            if (!otpSecret) throw new RpcException('OtpSecretNotFound')

            const isValid = this.securityService.verifyTotp(totp, otpSecret)
            if (!isValid) {
                await this.registerMfaFailure(userId, strategy, context)
                return false
            }
        }

        await this.clearMfaFailures(userId, strategy, context)

        await this.userService.appendMfaStrategy(userId, strategy)

        await this.securityAuditService.mfaEnabled(userId, GeneralUtils.getEnumKeyByValue(MfaStrategy, strategy) ?? 'unknown')

        return true
    }

    public async disableMfa_firstStep(userId: UUID, strategy: MfaStrategy): Promise<MfaAuthMetadata> {

        await this.throttleMfaSend(userId, strategy, MfaContext.DISABLE_SEND)

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

        const encStrategies = await this.userService.getUserEncryptedEnabledMfaStrategies(userId)
        const strategies = encStrategies.map((s) => this.securityService.decrypt_AES256(s) as MfaStrategy)
        if (!strategies.includes(strategy)) {
            throw new RpcException(`InvalidMfaStrategy::${strategy} strategy not currently active`)
        }

        const firstName = await this.userService.getUserFirstNameById(userId) as string

        switch (strategy) {
            case MfaStrategy.EMAIL_OTP:
                email = await this.userService.getUserEmailById(userId) as string
                totpSecret = await this.userService.getOtpSecretByUserId(userId)
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
                totpSecret = await this.userService.getOtpSecretByUserId(userId)
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

        await this.clearMfaFailures(userId, strategy, MfaContext.DISABLE_SEND)

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
                break
            case MfaStrategy.SMS_OTP:
                tokenType = TokenType.SmsOtpMfaInactivationToken
                break
            case MfaStrategy.APP_TOTP:
                tokenType = TokenType.AppTotpMfaInactivationToken
                break
            default:
                throw new RpcException(`UnsupportedMfaStrategy::${GeneralUtils.getEnumKeyByValue(MfaStrategy, strategy)}`)
        }

        const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(secureToken, tokenType)
        await this.sessionService.revokeToken(jti.toString())

        const context = MfaContext.DISABLE_VERIFY
        await this.ensureMfaNotLocked(userId, strategy, context)

        if (!await this.userService.existsUserById(userId)) {
            throw new RpcException('NoSuchUser')
        }

        let otpSecret: string | nullish
        if (strategy === MfaStrategy.APP_TOTP) {
            otpSecret = await this.userService.getAppTotpSecretByUserId(userId)
        } else {
            otpSecret = await this.userService.getOtpSecretByUserId(userId)
        }

        if (!otpSecret) {
            throw new RpcException('OtpSecretNotFound')
        }

        const isValid = this.securityService.verifyTotp(totp, otpSecret, strategy === MfaStrategy.APP_TOTP)
        if (!isValid) {
            await this.registerMfaFailure(userId, strategy, context)
            return false
        }

        await this.dataSource.manager.transaction(async (manager) => {

            const row = await manager.createQueryBuilder(User, 'u')
                .select(['u.mfaStrategies'])
                .where('u.id = :id', { id: userId })
                .getOneOrFail()

            const { mfaStrategies: rawMfaStrategies } = row
            let deserialized: string[]
            try {
                deserialized = JSON.parse(rawMfaStrategies || '[]') as string[]
            } catch (e) {
                this.logger.warn(` > disableMfa_secondStep_verifyTotpAndRemoveStrategy: error in deserialization: `, (e.stack ?? e) as object)
                throw e
            }
            const mfaStrategiesWithoutJustDisabledStrategy = deserialized
                .map((enc) => this.securityService.decrypt_AES256(enc))
                .map(uuid => GeneralUtils.getEnumValue(MfaStrategy, uuid))
                .filter((val): val is MfaStrategy => val !== undefined)
                .filter(st => st !== strategy)

            if (mfaStrategiesWithoutJustDisabledStrategy.length === 1 && mfaStrategiesWithoutJustDisabledStrategy) {
                const i = mfaStrategiesWithoutJustDisabledStrategy.findIndex((st) => st === MfaStrategy.BACKUP_CODE)
                if (i !== -1) {
                    mfaStrategiesWithoutJustDisabledStrategy.splice(i, 1)
                }
            }

            await manager.update(User,
                {
                    id: userId
                },
                {
                    mfaStrategies: JSON.stringify(
                        mfaStrategiesWithoutJustDisabledStrategy.map((uuid) => this.securityService.encrypt_AES256(uuid))
                    )

                })
            if (strategy === MfaStrategy.APP_TOTP) {
                await manager.update(User, { id: userId }, {
                    appTotpSecret: null
                })
            }
            if (mfaStrategiesWithoutJustDisabledStrategy.length === 0) {
                await manager.delete(MfaBackupCode, { userId })
            }
        })

        await this.securityAuditService.mfaDisabled(userId, GeneralUtils.getEnumKeyByValue(MfaStrategy, strategy) ?? 'unknown')

        await this.clearMfaFailures(userId, strategy, context)
        return true
    }



}
