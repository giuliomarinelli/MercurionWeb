import { ConfigService } from '@nestjs/config';
import { HttpStatus, Injectable } from '@nestjs/common';
import { UserRegisterDTO } from 'src/app_modules/user/models/dto/user-register.cls.dto';
import { UserService } from 'src/app_modules/user/services/user.service';
import { ConfirmChangeDTO, ConfirmDTO, ConfirmWithObsContDTO, ConfirmWithPhoneMfaFeedback, ConfirmWithRecoveryCodeDTO } from 'src/models/confirm-responses.dto';
import { PasswordEncoderService } from '../services/password-encoder.service';
import { SecurityService } from '../services/security.service';
import { ResponseService } from 'src/services/response.service';
import { JwtToolsService } from '../services/jwt-tools.service';
import { TokenType } from '../models/enums/token-type.enum';
import { MailSenderService } from 'src/app_modules/notification/services/mail-sender/mail-sender.service';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { errorMessage, errorStack } from 'src/utils/errors/error-message'

import { User } from 'src/app_modules/user/models/entities/user.entity';
import { createHmac, UUID } from 'crypto';
import { SessionService } from '../services/session.service';
import { SmsSenderService } from 'src/app_modules/notification/services/sms-sender/sms-sender.service';
import { ChangePhoneDTO } from '../models/dto/change-phone.cls.dto';
import { ContactChangeKind } from '../models/enums/contact-change-kind.enum';
import { PasswordContext } from '../models/enums/password-context.enum';
import { CompareResult } from '../models/enums/compare-result.enum';
import { SecurityAuditService } from 'src/app_modules/meilisearch/services/security-audit.service';
import { LoggerPort } from 'src/logging/logger.port';
import { LoggerContext } from 'src/logging/logger.port';
import { publicTotpMetadata } from 'src/utils/temporal/temporal'
import { DataSource, QueryFailedError } from 'typeorm';
import { ScopeService } from '../services/scope.service';
import { MfaBackupCode } from 'src/app_modules/user/models/entities/backup-code.entity';
import { RecoverCredentialsDTO } from '../models/dto/recover-credentials.cls.dto';
import { TypeGuards } from 'src/utils/type-guards/type-guards';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { MfaStrategy } from 'src/app_modules/user/models/enums/mfa-strategy.enum';
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { redisDurations, redisKeys } from 'src/app_modules/redis/contracts/redis-contracts'
import { AtomicAttemptPolicyService } from 'src/app_modules/redis/services/atomic-attempt-policy.service'
import { afterTransactionCommit, runInTransaction, transactionManager, UnitOfWork } from 'src/persistence/transaction-context'
import { InitialWorkspaceService } from 'src/app_modules/molecule-collection/services/initial-workspace.service'
import { ActivationReceipt } from '../models/entities/activation-receipt.entity'






@Injectable()
export class AccountFlowKernel {

    private readonly logger: LoggerContext

    private readonly CHANGE_PASSWORD_TOKEN_EXPIRATION_MS: number

    private readonly redisIdHmacSecret: string

    constructor(
        private readonly userService: UserService,
        private readonly passwordEncoder: PasswordEncoderService,
        private readonly securityService: SecurityService,
        private readonly jwtTools: JwtToolsService,
        private readonly configService: ConfigService,
        private readonly mailService: MailSenderService,
        private readonly smsService: SmsSenderService,
        private readonly redisService: RedisService,
        private readonly attempts: AtomicAttemptPolicyService,
        private readonly sessionService: SessionService,
        private readonly _r: ResponseService,
        private readonly securityAuditService: SecurityAuditService,
        private readonly dataSource: DataSource,
        private readonly scopeService: ScopeService,
        private readonly unitOfWork: UnitOfWork,
        private readonly initialWorkspace: InitialWorkspaceService,
        meiliLogger: LoggerPort
    ) {
        this.CHANGE_PASSWORD_TOKEN_EXPIRATION_MS = this.configService.get<number>('Jwt.changePasswordToken.expiresInMs') ?? 300_000
        this.redisIdHmacSecret = this.configService.get<string>('App.redisIdHmacSecret')!
        this.logger = meiliLogger.forContext(AccountFlowKernel.name)
    }

    private hmacKey(raw: string): string {
        return createHmac('sha256', this.redisIdHmacSecret)
            .update(raw.toLowerCase(), 'utf8')
            .digest('hex')
    }

    private getRegistrationLockRedisKey(email: string) {
        const digest = this.hmacKey(email.toLowerCase())
        return redisKeys.account.registrationLock(digest)
    }

    private getChangeFailKey(userId: UUID, kind: ContactChangeKind) {
        return redisKeys.account.changeFailure(kind, userId)
    }

    private getChangeLockKey(userId: UUID, kind: ContactChangeKind) {
        return redisKeys.account.changeLock(kind, userId)
    }

    private getChangeSendKey(userId: UUID, kind: ContactChangeKind) {
        return redisKeys.account.changeSend(kind, userId)
    }

    private getChangeSendLockKey(userId: UUID, kind: ContactChangeKind) {
        return redisKeys.account.changeSendLock(kind, userId)
    }

    private getRecoveryFailKey(code: string) {
        return redisKeys.account.recoveryFailure(this.hmacKey(code))
    }
    private getRecoveryLockKey(code: string) {
        return redisKeys.account.recoveryLock(this.hmacKey(code))
    }

    private getRecoverySecondFailKey(userId: UUID) {
        return redisKeys.account.recoverySecondFailure(userId)
    }
    private getRecoverySecondLockKey(userId: UUID) {
        return redisKeys.account.recoverySecondLock(userId)
    }

    private async ensureRecoverySecondNotLocked(userId: UUID) {
        if (!await this.attempts.assertAllowed('accountRecoverySecondFailure', this.getRecoverySecondLockKey(userId))) {
            throw applicationError(ApplicationErrorCode.ACCOUNT_RECOVERY_SECOND_TOO_MANY_ATTEMPTS)
        }
    }

    private async registerRecoverySecondFailure(userId: UUID) {
        await this.attempts.recordFailure(
            'accountRecoverySecondFailure',
            this.getRecoverySecondFailKey(userId),
            this.getRecoverySecondLockKey(userId)
        )
    }

    private async clearRecoverySecondFailures(userId: UUID) {
        await this.attempts.reset(
            'accountRecoverySecondFailure',
            this.getRecoverySecondFailKey(userId),
            this.getRecoverySecondLockKey(userId)
        )
    }

    private async ensureRecoveryNotLocked(code: string) {
        if (!await this.attempts.assertAllowed('accountRecoveryFailure', this.getRecoveryLockKey(code))) {
            throw applicationError(ApplicationErrorCode.ACCOUNT_RECOVERY_TOO_MANY_ATTEMPTS)
        }
    }

    private async registerRecoveryFailure(code: string) {
        await this.attempts.recordFailure(
            'accountRecoveryFailure',
            this.getRecoveryFailKey(code),
            this.getRecoveryLockKey(code)
        )
    }

    private async ensureContactChangeNotLocked(userId: UUID, kind: ContactChangeKind): Promise<void> {
        const lockKey = this.getChangeLockKey(userId, kind)
        if (!await this.attempts.assertAllowed('accountContactFailure', lockKey)) {
            throw applicationError(ApplicationErrorCode.ACCOUNT_CONTACT_CHANGE_TOO_MANY_ATTEMPTS, `Change${kind.charAt(0).toUpperCase()}${kind.slice(1)}::TooManyAttempts`)
        }
    }

    private async registerContactChangeFailure(userId: UUID, kind: ContactChangeKind): Promise<void> {

        const failKey = this.getChangeFailKey(userId, kind)
        const lockKey = this.getChangeLockKey(userId, kind)

        await this.attempts.recordFailure('accountContactFailure', failKey, lockKey)
    }

    private async clearContactChangeFailures(userId: UUID, kind: ContactChangeKind): Promise<void> {
        const failKey = this.getChangeFailKey(userId, kind)
        const lockKey = this.getChangeLockKey(userId, kind)
        await this.attempts.reset('accountContactFailure', failKey, lockKey)
    }

    private async throttleContactChangeSend(userId: UUID, kind: ContactChangeKind): Promise<void> {
        const countKey = this.getChangeSendKey(userId, kind)
        const lockKey = this.getChangeSendLockKey(userId, kind)

        if (!await this.attempts.assertAllowed('accountContactSend', lockKey)) {
            throw applicationError(ApplicationErrorCode.ACCOUNT_CONTACT_CHANGE_SEND_TOO_MANY_REQUESTS, `Change${kind.charAt(0).toUpperCase()}${kind.slice(1)}Send::TooManyRequests`)
        }

        const result = await this.attempts.recordSend('accountContactSend', countKey, lockKey)
        if (!result.allowed) {
            throw applicationError(ApplicationErrorCode.ACCOUNT_CONTACT_CHANGE_SEND_TOO_MANY_REQUESTS, `Change${kind.charAt(0).toUpperCase()}${kind.slice(1)}Send::TooManyRequests`)
        }
    }

    private getPasswordFailKey(userId: UUID, context: PasswordContext = PasswordContext.CHANGE) {
        return redisKeys.account.passwordFailure(context, userId)
    }

    private getPasswordLockKey(userId: UUID, context: PasswordContext = PasswordContext.CHANGE) {
        return redisKeys.account.passwordLock(context, userId)
    }

    private getPasswordResetSendKey(userId: UUID, context: PasswordContext = PasswordContext.RESET_SEND) {
        return redisKeys.account.passwordResetSend(context, userId)
    }

    private getPasswordResetSendLockKey(userId: UUID, context: PasswordContext = PasswordContext.RESET_SEND) {
        return redisKeys.account.passwordResetSendLock(context, userId)
    }

    private async ensurePasswordNotLocked(userId: UUID, context: PasswordContext = PasswordContext.CHANGE): Promise<void> {
        const lockKey = this.getPasswordLockKey(userId, context)
        if (!await this.attempts.assertAllowed('accountPasswordFailure', lockKey)) {
            throw applicationError(ApplicationErrorCode.PASSWORD_TOO_MANY_ATTEMPTS)
        }
    }

    private async registerPasswordFailure(userId: UUID, context: PasswordContext = PasswordContext.CHANGE): Promise<void> {
        const failKey = this.getPasswordFailKey(userId, context)
        const lockKey = this.getPasswordLockKey(userId, context)

        await this.attempts.recordFailure('accountPasswordFailure', failKey, lockKey)
    }

    private async clearPasswordFailures(userId: UUID, context: PasswordContext = PasswordContext.CHANGE): Promise<void> {
        const failKey = this.getPasswordFailKey(userId, context)
        const lockKey = this.getPasswordLockKey(userId, context)
        await this.attempts.reset('accountPasswordFailure', failKey, lockKey)
    }

    private async throttlePasswordResetSend(userId: UUID, context: PasswordContext = PasswordContext.RESET_SEND): Promise<void> {

        const countKey = this.getPasswordResetSendKey(userId, context)
        const lockKey = this.getPasswordResetSendLockKey(userId, context)

        if (!await this.attempts.assertAllowed('accountPasswordSend', lockKey)) {
            throw applicationError(ApplicationErrorCode.PASSWORD_RESET_SEND_TOO_MANY_REQUESTS)
        }

        const result = await this.attempts.recordSend('accountPasswordSend', countKey, lockKey)
        if (!result.allowed) {
            throw applicationError(ApplicationErrorCode.PASSWORD_RESET_SEND_TOO_MANY_REQUESTS)
        }
    }

    public async registerUser(registerDTO: UserRegisterDTO): Promise<ConfirmWithObsContDTO> {

        const { password, email, firstName, lastName, job, gender } = registerDTO
        const normalizedEmail = email.trim().toLowerCase()
        const emailKey = this.getRegistrationLockRedisKey(normalizedEmail)
        const ttl = redisDurations.hours(2)
        const alreadyExists = await this.redisService.exists(emailKey) || await this.userService.existsUserByEmail(normalizedEmail)
        if (alreadyExists) {
            throw applicationError(ApplicationErrorCode.USER_REGISTRATION_EMAIL_CONFLICT)
        }
        await this.redisService.set(emailKey, 'locked', ttl)
        const passwordHash = await this.passwordEncoder.encode(password)
        const otpSecret = this.securityService.generateOtpSecret()
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
        let userId: UUID
        try {
            ({ id: userId } = await this.unitOfWork.run(async context => {
                const user = await this.userService.createRegistration({
                    passwordHash,
                    otpSecret,
                    unconfirmedEmail: normalizedEmail,
                    registrationIdentity: normalizedEmail,
                    firstName,
                    lastName,
                    scopes: this.scopeService.getEncryptedStandardScopes(),
                    initials,
                    job: (job ?? '').trim() ? job : null,
                    gender
                }, context)
                return user
            }))
        } catch (error) {
            if (error instanceof QueryFailedError) {
                throw applicationError(ApplicationErrorCode.USER_REGISTRATION_EMAIL_CONFLICT)
            }
            throw error
        }
        const activationToken: string = await this.jwtTools.generateToken(userId, TokenType.ActivationToken)
        const url = `${this.configService.get<string>("App.activationOrigin")!}/account/activate#t=${encodeURIComponent(activationToken)}`
        await this.mailService.send('account-confirmation', normalizedEmail, { firstName, url })
        return {
            ...this._r.ok('Registration performed successfully', HttpStatus.CREATED),
            obscuredEmail: this.securityService.maskEmail(email)
        }

    }

    public async activateUser(activationToken: string): Promise<ConfirmWithRecoveryCodeDTO> | never {
        // A committed activation is replayable by its durable jti receipt.
        // Revocation is an after-commit optimization and must not turn a
        // successful retry into an ambiguous token failure.
        const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(
            activationToken,
            TokenType.ActivationToken,
            false,
            true
        )
        return this.unitOfWork.run(async (context) => {
            const manager = transactionManager(context)
            const existing = await manager.findOne(ActivationReceipt, { where: { jti } })
            if (existing) {
                if (String(existing.userId) !== String(userId)) {
                    throw applicationError(ApplicationErrorCode.TOKEN_INVALID_OR_EXPIRED)
                }
                return {
                    ...this._r.ok('Account activated successfully'),
                    recoveryCode: this.securityService.decrypt_AES256(existing.recoveryCode)
                }
            }

            const recoveryCode = this.securityService.generateAccountRecoveryReadableCode()
            const accountRecoveryCodeHash = await this.passwordEncoder.encode(recoveryCode)
            const activation = await this.userService.activateAccount(userId, accountRecoveryCodeHash, context)
            await this.initialWorkspace.initializeForUser(userId, context)
            await manager.save(manager.create(ActivationReceipt, {
                jti,
                userId,
                email: activation.email,
                recoveryCode: this.securityService.encrypt_AES256(recoveryCode),
                createdAt: Date.now()
            }))
            afterTransactionCommit(context, async () => {
                await this.sessionService.revokeToken(jti)
                await this.redisService.del(this.getRegistrationLockRedisKey(activation.email))
            })
            return {
                ...this._r.ok('Account activated successfully'),
                recoveryCode
            }
        })
    }

    public async changeEmail_firstStep_requestTotp(userId: UUID, newEmail: string): Promise<ConfirmChangeDTO> {

        const user = await this.userService.getUserById(userId)
        if (!user) {
            throw applicationError(ApplicationErrorCode.CHANGE_EMAIL_USER_NOT_FOUND)
        }

        if (user.sso) {
            throw applicationError(ApplicationErrorCode.UNPROCESSABLE_ENTITY)
        }

        if (!newEmail || newEmail.trim() === '') throw applicationError(ApplicationErrorCode.CHANGE_EMAIL_EMPTY)
        if (newEmail.toLowerCase() === user.email?.toLowerCase()) {
            throw applicationError(ApplicationErrorCode.CHANGE_EMAIL_IS_CURRENT)
        }

        await this.throttleContactChangeSend(userId, ContactChangeKind.EMAIL)

        // Lock per evitare abusi e race condition
        const lockKey = redisKeys.account.emailChangeLock(this.hmacKey(newEmail.toLowerCase()))
        const exists = await this.redisService.exists(lockKey)
        if (exists) {
            throw applicationError(ApplicationErrorCode.CHANGE_EMAIL_IN_USE_OR_PENDING)
        }
        await this.redisService.set(lockKey, 'locked', redisDurations.minutes(5))

        const updatedUser = await this.userService.updateUser(userId, {
            unconfirmedEmail: newEmail,
            updatedAt: Date.now()
        })
        if (!updatedUser) {
            throw applicationError(ApplicationErrorCode.CHANGE_EMAIL_USER_NOT_FOUND)
        }

        const emailVerificationToken = await this.jwtTools.generateToken(userId, TokenType.EmailVerificationToken)
        const { TOTP: totp, ...metadata } = this.securityService.generateTotp(user.otpSecret)

        await this.mailService.send('email-verification', newEmail, {
            firstName: user.firstName,
            period: this.configService.get<number>('Totp.period') as number,
            totp
        })

        const obscuredEmail = this.securityService.maskEmail(newEmail)

        return {
            ...this._r.ok(`Email change requested. Check ${obscuredEmail} for verification code`),
            obscuredEmail,
            emailVerificationToken,
            ...publicTotpMetadata(metadata)
        }
    }

    public async changeEmail_secondStep_verifyTotp(totp: string, emailVerificationToken: string): Promise<ConfirmDTO> {

        const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(emailVerificationToken, TokenType.EmailVerificationToken)
        await this.sessionService.revokeToken(jti)

        await this.ensureContactChangeNotLocked(userId, ContactChangeKind.EMAIL)

        const user = await this.userService.getUserById(userId)
        if (!user) throw applicationError(ApplicationErrorCode.CHANGE_EMAIL_CONFIRM_USER_NOT_FOUND)
        if (!user.unconfirmedEmail) throw applicationError(ApplicationErrorCode.CHANGE_EMAIL_CONFIRM_NO_UNCONFIRMED_EMAIL)

        const isTotpValid = this.securityService.verifyTotp(totp, user.otpSecret)
        if (!isTotpValid) {
            await this.registerContactChangeFailure(userId, ContactChangeKind.EMAIL)
            throw applicationError(ApplicationErrorCode.CHANGE_EMAIL_CONFIRM_INVALID_TOTP)
        }

        await this.clearContactChangeFailures(userId, ContactChangeKind.EMAIL)

        const maskedOldEmail = this.securityService.maskEmail(user.email ?? '') || null
        const maskedNewEmail = this.securityService.maskEmail(user.unconfirmedEmail ?? '')
        const oldEmail = user.email
        const newEmail = user.unconfirmedEmail
        const updatedUser = await this.userService.updateUser(userId, {
            email: newEmail,
            unconfirmedEmail: null,
            updatedAt: Date.now()
        })
        if (!updatedUser) {
            throw applicationError(ApplicationErrorCode.CHANGE_EMAIL_CONFIRM_USER_NOT_FOUND)
        }

        await this.redisService.del(
            redisKeys.account.emailChangeLock(this.hmacKey(newEmail.toLowerCase()))
        )

        await this.securityAuditService.emailChanged(userId, maskedOldEmail, maskedNewEmail)

        this.mailService.send(
            'email-changed-old-contact',
            oldEmail!,
            {
                firstName: user.firstName,
                newEmail
            }
        ).catch((e) => {
            this.logger.warn(`Errore durante l'invio mail email changed, oldEmail=${this.hmacKey(oldEmail ?? '')}, userId=${userId}`, e as string | object)
        })

        this.mailService.send(
            'email-changed-new-contact',
            newEmail,
            {
                firstName: user.firstName,
                newEmail
            }
        ).catch((e) => {
            this.logger.warn(`Errore durante l'invio mail email changed, newEmail=${this.hmacKey(newEmail)}, userId=${userId}`, e as string | object)
        })

        return this._r.ok('Email successfully changed and verified')
    }

    public async deletePhoneNumber_firstStep_requestTotp(userId: UUID): Promise<ConfirmChangeDTO> {

        const user = await this.userService.getUserById(userId)
        if (!user) {
            throw applicationError(ApplicationErrorCode.DELETE_PHONE_USER_NOT_FOUND)
        }
        if (user.sso) {
            throw applicationError(ApplicationErrorCode.UNPROCESSABLE_ENTITY)
        }
        const currentNumber = user.completePhoneNumber
        if (!currentNumber) {
            throw applicationError(ApplicationErrorCode.DELETE_PHONE_NO_NUMBER)
        }
        const lockKey = redisKeys.account.phoneChangeLockForUser(
            this.hmacKey(userId),
            this.hmacKey(currentNumber)
        )
        const existsLock = await this.redisService.exists(lockKey)
        if (existsLock) {
            throw applicationError(ApplicationErrorCode.DELETE_PHONE_IN_USE_OR_PENDING)
        }
        await this.redisService.set(lockKey, 'locked', redisDurations.minutes(5))
        const updatedUser = await this.userService.updateUser(userId, {
            unconfirmedPhoneNumber: null,
            unconfirmedPhoneNumberPrefixLength: 0,
            updatedAt: Date.now()
        })
        if (!updatedUser) {
            throw applicationError(ApplicationErrorCode.DELETE_PHONE_USER_NOT_FOUND)
        }

        const phoneNumberVerificationToken = await this.jwtTools.generateToken(userId, TokenType.PhoneNumberVerificationToken)
        const { TOTP: totp, ...metadata } = this.securityService.generateTotp(user.otpSecret)

        await this.smsService.sendSms(
            currentNumber,
            `Ciao ${user.firstName}, questo è il tuo codice per rimuovere il tuo attuale numero da Mercurion: ${totp}\nValido per ${this.configService.get<number>('Totp.period')} secondi.`
        )

        return {
            ...this._r.ok(`Phone number deletion requested. Check ${this.securityService.maskPhone(currentNumber)} for verification code.`),
            obscuredPhoneNumber: this.securityService.maskPhone(currentNumber),
            phoneNumberVerificationToken,
            ...publicTotpMetadata(metadata)
        }

    }

    public async deletePhoneNumber_secondStep_verifyTotp(totp: string, secureToken: string): Promise<ConfirmWithPhoneMfaFeedback> {
        const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(secureToken, TokenType.PhoneNumberVerificationToken)
        await this.ensureContactChangeNotLocked(userId, ContactChangeKind.PHONE)

        const result = await runInTransaction(this.dataSource, async (context, manager) => {

            const user = await manager.findOne(User, { where: { id: userId } })
            if (!user) {
                throw applicationError(ApplicationErrorCode.DELETE_PHONE_USER_NOT_FOUND)
            }

            if (user.unconfirmedPhoneNumber || Number(user.unconfirmedPhoneNumberPrefixLength)) {
                throw applicationError(ApplicationErrorCode.DELETE_PHONE_NO_PENDING_DELETION)
            }

            const isTotpValid = this.securityService.verifyTotp(totp, user.otpSecret)
            if (!isTotpValid) {
                return null
            }
            const maskedOldPhone = this.securityService.maskPhone(user.completePhoneNumber ?? '') || null
            const oldCompletePhoneNumber = user.completePhoneNumber

            await manager.update(User, { id: userId }, {
                completePhoneNumber: null,
                phoneNumberPrefixLength: 0,
                unconfirmedPhoneNumber: null,
                unconfirmedPhoneNumberPrefixLength: 0,
                updatedAt: Date.now()
            })

            let phoneMfaDisabled = false

            let deserialized: string[]

            try {
                deserialized = JSON.parse(user.mfaStrategies) as string[]
            } catch {
                deserialized = []
            }

            let strategies = deserialized.map((enc) => this.securityService.decrypt_AES256(enc))
                .filter((dec) => TypeGuards.isMfaStrategy(dec))

            if (strategies.includes(MfaStrategy.SMS_OTP)) {
                strategies = strategies.filter((s) => s !== MfaStrategy.SMS_OTP)
                const encoded = GeneralUtils.distinctArray(strategies)
                    .map((dec) => this.securityService.encrypt_AES256(dec))
                const serialized = JSON.stringify(encoded)
                await manager.update(User, { id: userId }, {
                    mfaStrategies: serialized,
                    updatedAt: Date.now()
                })
                phoneMfaDisabled = true
            }

            const oldNotificationBody = 'Mercurion: il numero di telefono del tuo account è stato eliminato. Se non sei stato tu, reimposta subito la password e contatta il supporto Mercurion.'

            afterTransactionCommit(context, async () => {
                await this.sessionService.revokeToken(jti)
                await this.redisService.del(
                    redisKeys.account.phoneChangeLockForUser(
                        this.hmacKey(userId),
                        this.hmacKey(oldCompletePhoneNumber ?? '')
                    )
                )
                await this.clearContactChangeFailures(userId, ContactChangeKind.PHONE)
                await this.securityAuditService.phoneChanged(userId, maskedOldPhone, '')
                if (oldCompletePhoneNumber != null) {
                    this.smsService.sendSms(oldCompletePhoneNumber, oldNotificationBody).catch((e) => {
                        this.logger.warn(`Errore durante l'invio sms phone deleted, currentPhone=${this.hmacKey(oldCompletePhoneNumber)}, userId=${userId}`, e as string | object)
                    })
                }
            })

            return {
                ...this._r.ok('Phone number successfully deleted'),
                phoneMfaDisabled
            }
        })
        if (!result) {
            await this.registerContactChangeFailure(userId, ContactChangeKind.PHONE)
            throw applicationError(ApplicationErrorCode.CHANGE_PHONE_INVALID_TOTP)
        }
        return result
    }

    public async changePhoneNumber_firstStep_requestTotp(userId: UUID, dto: ChangePhoneDTO): Promise<ConfirmChangeDTO> {


        const { internationalPrefix, phoneNumber } = dto
        const user = await this.userService.getUserById(userId)
        if (!user) {
            throw applicationError(ApplicationErrorCode.CHANGE_PHONE_USER_NOT_FOUND)
        }
        if (user.sso) {
            throw applicationError(ApplicationErrorCode.UNPROCESSABLE_ENTITY)
        }
        await this.throttleContactChangeSend(userId, ContactChangeKind.PHONE)

        const fullNumber = `${internationalPrefix ?? ''}${phoneNumber ?? ''}`
        const currentNumber = user.completePhoneNumber

        if (fullNumber === currentNumber) {
            throw applicationError(ApplicationErrorCode.CHANGE_PHONE_ALREADY_SET)
        }

        // lock per evitare abusi e race condition
        const lockKey = redisKeys.account.phoneChangeLock(this.hmacKey(fullNumber))
        const existsLock = await this.redisService.exists(lockKey)
        if (existsLock) {
            throw applicationError(ApplicationErrorCode.CHANGE_PHONE_IN_USE_OR_PENDING)
        }

        await this.redisService.set(lockKey, 'locked', redisDurations.minutes(5))

        const updatedUser = await this.userService.updateUser(userId, {
            unconfirmedPhoneNumber: fullNumber,
            unconfirmedPhoneNumberPrefixLength: internationalPrefix.length,
            updatedAt: Date.now()
        })
        if (!updatedUser) {
            throw applicationError(ApplicationErrorCode.CHANGE_PHONE_USER_NOT_FOUND)
        }

        const phoneNumberVerificationToken = await this.jwtTools.generateToken(userId, TokenType.PhoneNumberVerificationToken)
        const { TOTP: totp, ...metadata } = this.securityService.generateTotp(user.otpSecret)

        await this.smsService.sendSms(
            fullNumber,
            `Ciao ${user.firstName}, questo è il tuo codice per confermare il nuovo numero su Mercurion: ${totp}\nValido per ${this.configService.get<number>('Totp.period')} secondi.`
        )

        return {
            ...this._r.ok(`Phone number change requested. Check ${this.securityService.maskPhone(fullNumber)} for verification code.`),
            obscuredPhoneNumber: this.securityService.maskPhone(fullNumber),
            phoneNumberVerificationToken,
            ...publicTotpMetadata(metadata)
        }

    }

    public async changePhoneNumber_secondStep_verifyTotp(totp: string, token: string): Promise<ConfirmDTO> {

        const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(token, TokenType.PhoneNumberVerificationToken)

        await this.sessionService.revokeToken(jti)

        await this.ensureContactChangeNotLocked(userId, ContactChangeKind.PHONE)

        const user = await this.userService.getUserById(userId)
        if (!user) throw applicationError(ApplicationErrorCode.CHANGE_PHONE_USER_NOT_FOUND)

        if (!user.unconfirmedPhoneNumber || !user.unconfirmedPhoneNumberPrefixLength)
            throw applicationError(ApplicationErrorCode.CHANGE_PHONE_NO_PENDING_CHANGE)

        const isTotpValid = this.securityService.verifyTotp(totp, user.otpSecret)
        if (!isTotpValid) {
            await this.registerContactChangeFailure(userId, ContactChangeKind.PHONE)
            throw applicationError(ApplicationErrorCode.CHANGE_PHONE_INVALID_TOTP)
        }
        const maskedOldPhone = this.securityService.maskPhone(user.completePhoneNumber ?? '') || null
        const maskedNewPhone = this.securityService.maskPhone(user.unconfirmedPhoneNumber ?? '')
        const oldCompletePhoneNumber = user.completePhoneNumber
        const newCompletePhoneNumber = user.unconfirmedPhoneNumber
        const newPhoneNumberPrefixLength = user.unconfirmedPhoneNumberPrefixLength


        const updatedUser = await this.userService.updateUser(userId, {
            completePhoneNumber: newCompletePhoneNumber,
            phoneNumberPrefixLength: newPhoneNumberPrefixLength,
            unconfirmedPhoneNumber: null,
            unconfirmedPhoneNumberPrefixLength: 0,
            updatedAt: Date.now()
        })
        if (!updatedUser) {
            throw applicationError(ApplicationErrorCode.CHANGE_PHONE_USER_NOT_FOUND)
        }

        await this.redisService.del(
            redisKeys.account.phoneChangeLock(this.hmacKey(newCompletePhoneNumber))
        )
        await this.clearContactChangeFailures(userId, ContactChangeKind.PHONE)

        const oldNotificationBody = 'Mercurion: il numero di telefono del tuo account è stato cambiato. Se non sei stato tu, reimposta subito la password e contatta il supporto Mercurion.';

        const newNotificationBody = 'Mercurion: questo numero è stato appena associato a un account Mercurion. Se non riconosci questa operazione, ignora il messaggio e contatta il supporto.';

        await this.securityAuditService.phoneChanged(userId, maskedOldPhone, maskedNewPhone)
        if (oldCompletePhoneNumber != null) {
            this.smsService.sendSms(oldCompletePhoneNumber, oldNotificationBody).catch((e) => {
                this.logger.warn(`Errore durante l'invio sms phone changed, oldPhone=${this.hmacKey(oldCompletePhoneNumber)}, userId=${userId}`, e as string | object)
            })
        }

        this.smsService.sendSms(newCompletePhoneNumber, newNotificationBody).catch((e) => {
            this.logger.warn(`Errore durante l'invio sms phone changed, newPhone=${this.hmacKey(newCompletePhoneNumber)}, userId=${userId}`, e as string | object)
        })

        return this._r.ok('Phone number successfully updated')

    }

    public async changePassword(oldPassword: string, newPassword: string, userId: UUID): Promise<void> | never {
        const ur = await this.dataSource.getRepository(User).findOne({
            where: {
                id: userId
            },
            select: {
                sso: true
            }
        })
        if ((ur && ur.sso) || !ur) {
            throw applicationError(ApplicationErrorCode.UNPROCESSABLE_ENTITY)
        }
        await this.ensurePasswordNotLocked(userId, PasswordContext.CHANGE)
        const oldPasswordHash = await this.userService.getVerifiedUserPasswordHashById(userId)
        if (oldPasswordHash && await this.passwordEncoder.compareWithFallback(oldPassword, oldPasswordHash) === CompareResult.NoMatch) {
            await this.registerPasswordFailure(userId, PasswordContext.CHANGE)
            throw applicationError(ApplicationErrorCode.PASSWORD_CHANGE_CREDENTIALS_INVALID)
        }
        await this.clearPasswordFailures(userId, PasswordContext.CHANGE)
        await this.userService.changePassword(userId, newPassword)
        await this.securityAuditService.passwordChanged(userId, { viaResetFlow: false })
        const email = (await this.userService.getUserProvidedEmailById(userId))!.email
        const firstName = (await this.userService.getUserFirstNameById(userId))!
        this.mailService.send(
            'password-changed',
            email,
            { firstName }
        ).catch((e) => {
            this.logger.warn(`Errore durante l'invio email password changed, userId=${userId}`, e as string | object)
        })
    }

    public async sendForgottenPasswordLink(email: string): Promise<void> | never {
        const userId = await this.userService.getUserIdByEmail(email)
        if (!userId) {
            throw applicationError(ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED)
        }
        let locked: boolean
        let sso: boolean = false
        try {
            ({ locked, sso } = await this.dataSource.getRepository(User).findOneOrFail({
                where: {
                    id: userId as UUID
                },
                select: {
                    locked: true,
                    sso: true
                }
            }))
            if (sso) {
                throw applicationError(ApplicationErrorCode.UNPROCESSABLE_ENTITY)
            }
        } catch {
            throw applicationError(ApplicationErrorCode.PERMISSION_DENIED)
        }
        if (locked) {
            throw applicationError(ApplicationErrorCode.PERMISSION_DENIED)
        }
        await this.throttlePasswordResetSend(userId as UUID, PasswordContext.RESET_SEND)
        const changePasswordToken = await this.jwtTools.generateToken(userId as UUID, TokenType.ChangePasswordToken)
        const firstName = await this.userService.getUserFirstNameById(userId as UUID)
        const url = `${this.configService.get<string>("App.activationOrigin")}/password-recovery#t=${encodeURIComponent(changePasswordToken)}`
        await this.mailService.send(
            'forgotten-password',
            email,
            {
                url,
                firstName: firstName ?? 'Utente'
            }
        )
    }

    public async forgottenPassword(newPassword: string, changePasswordToken: string): Promise<void> | never {
        const { sub: userId } = await this.jwtTools.verifyTokenAndGetPayload(
            changePasswordToken,
            TokenType.ChangePasswordToken
        )
        let locked: boolean
        try {
            ({ locked } = await this.dataSource.getRepository(User).findOneOrFail({
                where: {
                    id: userId
                },
                select: {
                    locked: true
                }
            }))
        } catch {
            throw applicationError(ApplicationErrorCode.PERMISSION_DENIED)
        }
        if (locked) {
            throw applicationError(ApplicationErrorCode.PERMISSION_DENIED)
        }
        const sessions = await this.sessionService.getAllSessionsByUserId(userId, { onlyValid: false })
        for (const s of sessions) {
            await this.sessionService.revokeAllTokensBySessionId(s.sessionId)
        }
        for (const s of sessions) {
            await this.sessionService.destroySessionByOwner(s.sessionId, s.userId)
        }
        await this.userService.changePassword(userId, newPassword)
        await this.clearPasswordFailures(userId, PasswordContext.CHANGE)
        await this.securityAuditService.passwordChanged(userId, { viaResetFlow: true })
        const email = (await this.userService.getUserProvidedEmailById(userId))!.email
        const firstName = (await this.userService.getUserFirstNameById(userId))!
        this.mailService.send(
            'password-changed',
            email,
            { firstName }
        ).catch((e) => {
            this.logger.warn(`Errore durante l'invio email password changed, userId=${userId}`, e as string | object)
        })
    }


    public async isAuthorizedToRecoverPassword(changePasswordToken: string): Promise<boolean> {

        let jti: UUID
        try {
            ({ jti } = await this.jwtTools.verifyTokenAndGetPayload(changePasswordToken, TokenType.ChangePasswordToken))
            const redisKey = redisKeys.account.changePasswordLock(jti)
            if (await this.redisService.exists(redisKey)) {
                return false
            }
            await this.redisService.set(
                redisKey,
                '1',
                redisDurations.seconds(this.CHANGE_PASSWORD_TOKEN_EXPIRATION_MS / 1000)
            )
            return true
        } catch {
            return false
        }

    }

    public async isUserAvailableByEmail(email: string): Promise<boolean> {
        const existsVerified = await this.userService.existsUserByEmail(email)
        const redisKey = this.getRegistrationLockRedisKey(email)
        const existsUnverified = await this.redisService.exists(redisKey)
        return !existsVerified && !existsUnverified
    }

    public async recoverAccount_firstStep(code: string): Promise<string> | never {
        await this.ensureRecoveryNotLocked(code)
        const userId = await runInTransaction(this.dataSource, async (context, manager) => {

            const getTrue = () => true

            const BATCH_SIZE = 5_000

            let lastId: UUID | null = null
            let matchedUserId: UUID | null = null

            // scan a batch paginati con early-exit
            while (getTrue()) {
                const qb = manager
                    .createQueryBuilder(User, 'u')
                    .select(['u.id', 'u.accountRecoveryCodeHash'])
                    .where('u.accountRecoveryCodeHash IS NOT NULL')
                    .andWhere('u.isVerified = true')

                if (lastId) {
                    // UUIDv7 è ordinabile cronologicamente => paging per cursore
                    qb.andWhere('u.id > :lastId', { lastId })
                }

                const batch = await qb
                    .orderBy('u.id', 'ASC')
                    .take(BATCH_SIZE)
                    .getMany()

                if (batch.length === 0) {
                    break
                }

                for (const row of batch) {
                    const hash = row.accountRecoveryCodeHash
                    if (!hash) {
                        continue
                    }

                    const matches = (await this.passwordEncoder.compareWithFallback(code, hash, true)) !== CompareResult.NoMatch

                    if (matches) {
                        matchedUserId = row.id
                        break
                    }
                }

                if (matchedUserId) break

                // aggiorna cursore per batch successivo
                lastId = batch[batch.length - 1].id
            }

            if (!matchedUserId) return null

            const user = await manager.findOne(User, { where: { id: matchedUserId } })
            if (!user) {
                return null
            }

            user.locked = true
            user.mfaStrategies = '[]'
            user.recoveryMode = true
            user.unconfirmedEmail = user.email
            user.email = null

            await manager.save(user)

            await manager.delete(MfaBackupCode, { userId: matchedUserId })
            await this.securityAuditService.accountRecovery(
                matchedUserId,
                'ACCOUNT_RECOVERY_TOKEN_GENERATED',
                context
            )
            afterTransactionCommit(context, async () => {
                await this.redisService.del(this.getRecoveryFailKey(code))
                await this.redisService.del(this.getRecoveryLockKey(code))
                await this.sessionService.destroyAllSessionsAndRevokeAllTokensByUserId(matchedUserId)
            })

            return matchedUserId
        })
        if (!userId) {
            await this.registerRecoveryFailure(code)
            throw applicationError(ApplicationErrorCode.ACCOUNT_RECOVERY_CODE_INVALID)
        }
        return this.jwtTools.generateToken(userId, TokenType.AccountRecoveryToken)
    }

    public async recoverAccount_secondStep(dto: RecoverCredentialsDTO, secureToken: string): Promise<string> | never {
        const { newEmail, newPassword } = dto
        let userId: UUID
        let jti: UUID

        try {
            ({ sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(secureToken, TokenType.AccountRecoveryToken))
        } catch (e) {
            this.logger.debug(`recoverAccount_secondStep > error in secure_token validation: `, errorStack(e) ?? errorMessage(e))
            throw applicationError(ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED)
        }
        await this.ensureRecoverySecondNotLocked(userId)
        const newRecoveryCode = this.securityService.generateAccountRecoveryReadableCode()
        const newAccountRecoveryCodeHash = await this.passwordEncoder.encode(newRecoveryCode)
        const newPasswordHash = await this.passwordEncoder.encode(newPassword)

        const recovered = await runInTransaction(this.dataSource, async (context, manager) => {
            const user = await manager.findOne(User, {
                where: {
                    id: userId
                }
            })
            if (!user || !user.accountRecoveryCodeHash) {
                return false
            }
            user.email = newEmail
            user.unconfirmedEmail = null
            user.completePhoneNumber = null
            user.phoneNumberPrefixLength = 0
            user.unconfirmedPhoneNumber = null
            user.unconfirmedPhoneNumberPrefixLength = 0
            user.passwordHash = newPasswordHash
            user.isVerified = true
            user.scopes = this.scopeService.getEncryptedStandardScopes()
            user.updatedAt = Date.now()
            user.otpSecret = this.securityService.generateOtpSecret()
            user.appTotpSecret = null
            user.avatarId = null
            user.backupCodesGiven = false
            user.accountRecoveryCodeHash = newAccountRecoveryCodeHash
            user.locked = false
            user.recoveryMode = false
            user.oldPasswordHashes = []
            await manager.save(user)
            afterTransactionCommit(context, async () => {
                await this.sessionService.revokeToken(jti)
                await this.clearRecoverySecondFailures(userId)
            })
            return true
        })
        if (!recovered) {
            await this.registerRecoverySecondFailure(userId)
            throw applicationError(ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED)
        }
        return newRecoveryCode
    }

}
