import { ConfigService } from '@nestjs/config';
import { HttpStatus, Injectable } from '@nestjs/common';
import { UserRegisterDTO } from 'src/app_modules/user/Models/DTO/user-register.cls.dto';
import { UserService } from 'src/app_modules/user/services/user.service';
import { ConfirmChangeDTO, ConfirmDTO, ConfirmWithObsContDTO, ConfirmWithRecoveryCodeDTO } from 'src/Models/confirm-responses.dto';
import { PasswordEncoderService } from './password-encoder.service';
import { SercurityService } from './sercurity.service';
import { ResponseService } from 'src/services/response.service';
import { JwtToolsService } from './jwt-tools.service';
import { TokenType } from '../Models/enums/token-type.enum';
import { join } from 'path';
import { MailSenderService } from 'src/app_modules/notification/services/mail-sender/mail-sender.service';
import { UserCtaContext } from 'src/app_modules/notification/Models/contexts/user-cta.context';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { RpcException } from '@nestjs/microservices';
import { User } from 'src/app_modules/user/Models/entities/user.entity';
import { createHmac, UUID } from 'crypto';
import { EmailTotpContext } from 'src/app_modules/notification/Models/contexts/email-totp.context';
import { SessionService } from './session.service';
import { SmsSenderService } from 'src/app_modules/notification/services/sms-sender/sms-sender.service';
import { ChangePhoneDTO } from '../Models/DTO/change-phone.cls.dto';
import { ContactChangeKind } from '../Models/enums/contact-change-kind.enum';
import { PasswordContext } from '../Models/enums/password-context.enum';
import { CompareResult } from '../Models/enums/compare-result.enum';
import { SecurityAuditService } from 'src/app_modules/meilisearch/services/security-audit.service';
import { UserContext } from 'src/app_modules/notification/Models/contexts/user.context';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { DataSource } from 'typeorm';
import { ChEMBLMoleculeItemEntity } from 'src/app_modules/molecule-collection/Models/entities/chembl-molecule-item.entity';
import { uuidv7 } from '@kripod/uuidv7';
import { MoleculeCollection } from 'src/app_modules/molecule-collection/Models/entities/molecule-collection.entity';
import { MoleculeCollectionItemJoin } from 'src/app_modules/molecule-collection/Models/entities/molecule-collection-item-join.entity';
import { ScopeService } from './scope.service';
import { MfaBackupCode } from 'src/app_modules/user/Models/entities/backup-code.entity';
import { RecoverCredentialsDTO } from '../Models/DTO/recover-cretentials.cls.dto';





@Injectable()
export class AccountService {

    private readonly logger: MeiliContextLogger

    private readonly CHANGE_PASSWORD_TOKEN_EXPIRATION_MS: number

    private readonly CHANGE_CONTACT_FAIL_WINDOW_SECONDS = 10 * 60
    private readonly CHANGE_CONTACT_MAX_FAILS = 5
    private readonly CHANGE_CONTACT_LOCK_SECONDS = 15 * 60

    private readonly CHANGE_CONTACT_SEND_WINDOW_SECONDS = 10 * 60
    private readonly CHANGE_CONTACT_MAX_SENDS = 5

    private readonly PASSWORD_FAIL_WINDOW_SECONDS = 10 * 60
    private readonly PASSWORD_MAX_FAILS = 5
    private readonly PASSWORD_LOCK_SECONDS = 15 * 60

    private readonly PASSWORD_RESET_SEND_WINDOW_SECONDS = 10 * 60
    private readonly PASSWORD_RESET_MAX_SENDS = 5

    private readonly RECOVERY_FAIL_WINDOW_SECONDS = 24 * 60 * 60  // 1 giorno
    private readonly RECOVERY_MAX_FAILS = 2
    private readonly RECOVERY_LOCK_SECONDS = 24 * 60 * 60

    private readonly RECOVERY_SECOND_FAIL_WINDOW_SECONDS = 10 * 60
    private readonly RECOVERY_SECOND_MAX_FAILS = 2
    private readonly RECOVERY_SECOND_LOCK_SECONDS = 15 * 60

    private readonly redisIdHmacSecret: string

    constructor(
        private readonly userService: UserService,
        private readonly passwordEncoder: PasswordEncoderService,
        private readonly securityService: SercurityService,
        private readonly jwtTools: JwtToolsService,
        private readonly configService: ConfigService,
        private readonly mailService: MailSenderService,
        private readonly smsService: SmsSenderService,
        private readonly redisService: RedisService,
        private readonly sessionService: SessionService,
        private readonly _r: ResponseService,
        private readonly securityAuditService: SecurityAuditService,
        private readonly dataSource: DataSource,
        private readonly scopeService: ScopeService,
        meiliLogger: MeiliLoggerService
    ) {
        this.CHANGE_PASSWORD_TOKEN_EXPIRATION_MS = this.configService.get<number>('Jwt.changePasswordToken.expiresInMs') ?? 300_000
        this.redisIdHmacSecret = this.configService.get<string>('App.redisIdHmacSecret')!
        this.logger = meiliLogger.forContext(AccountService.name)
    }

    private hmacKey(raw: string): string {
        return createHmac('sha256', this.redisIdHmacSecret)
            .update(raw.toLowerCase(), 'utf8')
            .digest('hex')
    }

    private getRegistrationLockRedisKey(email: string): string {
        const digest = this.hmacKey(email.toLowerCase())
        return `email_registration_lock:${digest}`
    }

    private getChangeFailKey(userId: UUID, kind: ContactChangeKind): string {
        return `change:${kind}:totp:fail:${userId}`
    }

    private getChangeLockKey(userId: UUID, kind: ContactChangeKind): string {
        return `change:${kind}:totp:lock:${userId}`
    }

    private getChangeSendKey(userId: UUID, kind: ContactChangeKind): string {
        return `change:${kind}:send:${userId}`
    }

    private getChangeSendLockKey(userId: UUID, kind: ContactChangeKind): string {
        return `change:${kind}:send:lock:${userId}`
    }

    private getRecoveryFailKey(code: string) {
        return `recovery:fail:${this.hmacKey(code)}`
    }
    private getRecoveryLockKey(code: string) {
        return `recovery:lock:${this.hmacKey(code)}`
    }

    private getRecoverySecondFailKey(userId: UUID) {
        return `recovery:second:fail:${userId}`
    }
    private getRecoverySecondLockKey(userId: UUID) {
        return `recovery:second:lock:${userId}`
    }

    private async ensureRecoverySecondNotLocked(userId: UUID) {
        if (await this.redisService.exists(this.getRecoverySecondLockKey(userId))) {
            throw new RpcException('AccountRecoverySecond::TooManyAttempts')
        }
    }

    private async registerRecoverySecondFailure(userId: UUID) {
        const failKey = this.getRecoverySecondFailKey(userId)
        const lockKey = this.getRecoverySecondLockKey(userId)

        const fails = await this.redisService.getClient().incr(failKey)
        if (fails === 1) {
            await this.redisService.setTTL(failKey, this.RECOVERY_SECOND_FAIL_WINDOW_SECONDS)
        }

        if (fails >= this.RECOVERY_SECOND_MAX_FAILS) {
            await this.redisService.set(lockKey, '1', this.RECOVERY_SECOND_LOCK_SECONDS)
            await this.redisService.del(failKey)
        }
    }

    private async clearRecoverySecondFailures(userId: UUID) {
        await this.redisService.del(this.getRecoverySecondFailKey(userId))
        await this.redisService.del(this.getRecoverySecondLockKey(userId))
    }

    private async ensureRecoveryNotLocked(code: string) {
        if (await this.redisService.exists(this.getRecoveryLockKey(code))) {
            throw new RpcException('AccountRecovery::TooManyAttempts')
        }
    }

    private async registerRecoveryFailure(code: string) {
        const failKey = this.getRecoveryFailKey(code)
        const lockKey = this.getRecoveryLockKey(code)

        const fails = await this.redisService.getClient().incr(failKey)
        if (fails === 1) await this.redisService.setTTL(failKey, this.RECOVERY_FAIL_WINDOW_SECONDS)

        if (fails >= this.RECOVERY_MAX_FAILS) {
            await this.redisService.set(lockKey, '1', this.RECOVERY_LOCK_SECONDS)
            await this.redisService.del(failKey)
        }
    }

    private async ensureContactChangeNotLocked(userId: UUID, kind: ContactChangeKind): Promise<void> {
        const lockKey = this.getChangeLockKey(userId, kind)
        const locked = await this.redisService.exists(lockKey)
        if (locked) {
            throw new RpcException(`Change${kind.charAt(0).toUpperCase()}${kind.slice(1)}::TooManyAttempts`)
        }
    }

    private async registerContactChangeFailure(userId: UUID, kind: ContactChangeKind): Promise<void> {

        const failKey = this.getChangeFailKey(userId, kind)
        const lockKey = this.getChangeLockKey(userId, kind)

        const fails = await this.redisService.getClient().incr(failKey)

        if (fails === 1) {
            await this.redisService.setTTL(failKey, this.CHANGE_CONTACT_FAIL_WINDOW_SECONDS)
        }

        if (fails >= this.CHANGE_CONTACT_MAX_FAILS) {
            await this.redisService.set(lockKey, '1', this.CHANGE_CONTACT_LOCK_SECONDS)
            await this.redisService.del(failKey)
        }
    }

    private async clearContactChangeFailures(userId: UUID, kind: ContactChangeKind): Promise<void> {
        const failKey = this.getChangeFailKey(userId, kind)
        const lockKey = this.getChangeLockKey(userId, kind)
        await this.redisService.del(failKey)
        await this.redisService.del(lockKey)
    }

    private async throttleContactChangeSend(userId: UUID, kind: ContactChangeKind): Promise<void> {
        const countKey = this.getChangeSendKey(userId, kind)
        const lockKey = this.getChangeSendLockKey(userId, kind)

        const locked = await this.redisService.exists(lockKey)
        if (locked) {
            throw new RpcException(`Change${kind.charAt(0).toUpperCase()}${kind.slice(1)}Send::TooManyRequests`)
        }

        const cnt = await this.redisService.getClient().incr(countKey)
        if (cnt === 1) {
            await this.redisService.setTTL(countKey, this.CHANGE_CONTACT_SEND_WINDOW_SECONDS)
        }

        if (cnt > this.CHANGE_CONTACT_MAX_SENDS) {
            await this.redisService.set(lockKey, '1', this.CHANGE_CONTACT_LOCK_SECONDS)
            throw new RpcException(`Change${kind.charAt(0).toUpperCase()}${kind.slice(1)}Send::TooManyRequests`)
        }
    }

    private getPasswordFailKey(userId: UUID, context: PasswordContext = PasswordContext.CHANGE): string {
        return `pwd:fail:${context}:${userId}`
    }

    private getPasswordLockKey(userId: UUID, context: PasswordContext = PasswordContext.CHANGE): string {
        return `pwd:lock:${context}:${userId}`
    }

    private getPasswordResetSendKey(userId: UUID, context: PasswordContext = PasswordContext.RESET_SEND): string {
        return `pwd:reset:${context}:send:${userId}`
    }

    private getPasswordResetSendLockKey(userId: UUID, context: PasswordContext = PasswordContext.RESET_SEND): string {
        return `pwd:reset:${context}:send:lock:${userId}`
    }

    private async ensurePasswordNotLocked(userId: UUID, context: PasswordContext = PasswordContext.CHANGE): Promise<void> {
        const lockKey = this.getPasswordLockKey(userId, context)
        const locked = await this.redisService.exists(lockKey)
        if (locked) {
            throw new RpcException('Password::TooManyAttempts')
        }
    }

    private async registerPasswordFailure(userId: UUID, context: PasswordContext = PasswordContext.CHANGE): Promise<void> {
        const failKey = this.getPasswordFailKey(userId, context)
        const lockKey = this.getPasswordLockKey(userId, context)

        const fails = await this.redisService.getClient().incr(failKey)

        if (fails === 1) {
            await this.redisService.setTTL(failKey, this.PASSWORD_FAIL_WINDOW_SECONDS)
        }

        if (fails >= this.PASSWORD_MAX_FAILS) {
            await this.redisService.set(lockKey, '1', this.PASSWORD_LOCK_SECONDS)
            await this.redisService.del(failKey)
        }
    }

    private async clearPasswordFailures(userId: UUID, context: PasswordContext = PasswordContext.CHANGE): Promise<void> {
        const failKey = this.getPasswordFailKey(userId, context)
        const lockKey = this.getPasswordLockKey(userId, context)
        await this.redisService.del(failKey)
        await this.redisService.del(lockKey)
    }

    private async throttlePasswordResetSend(userId: UUID, context: PasswordContext = PasswordContext.RESET_SEND): Promise<void> {

        const countKey = this.getPasswordResetSendKey(userId, context)
        const lockKey = this.getPasswordResetSendLockKey(userId, context)

        const locked = await this.redisService.exists(lockKey)
        if (locked) {
            throw new RpcException('PasswordResetSend::TooManyRequests')
        }

        const cnt = await this.redisService.getClient().incr(countKey)
        if (cnt === 1) {
            await this.redisService.setTTL(countKey, this.PASSWORD_RESET_SEND_WINDOW_SECONDS)
        }

        if (cnt > this.PASSWORD_RESET_MAX_SENDS) {
            await this.redisService.set(lockKey, '1', this.PASSWORD_LOCK_SECONDS)
            throw new RpcException('PasswordResetSend::TooManyRequests')
        }
    }

    public async registerUser(registerDTO: UserRegisterDTO): Promise<ConfirmWithObsContDTO> {

        const { password, email, firstName, lastName, job, gender } = registerDTO
        const emailKey = this.getRegistrationLockRedisKey(email)
        const ttlSeconds = 2 * 60 * 60; // 2 ore
        const alreadyExists = await this.redisService.exists(emailKey) || await this.userService.existsUserByEmail(email)
        if (alreadyExists) {
            throw new RpcException('UserRegistrationConflict::Email already exists')
        }
        await this.redisService.set(emailKey, 'locked', ttlSeconds)
        const passwordHash = await this.passwordEncoder.encode(password)
        const otpSecret = this.securityService.generateOtpSecret()
        const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
        const { id: userId } = await this.userService.createUser({
            passwordHash,
            otpSecret,
            unconfirmedEmail: email,
            firstName,
            lastName,
            scopes: this.scopeService.getEncryptedStandardScopes(),
            initials,
            job: (job ?? '').trim() ? job : null,
            gender
        })
        const activationToken: string = await this.jwtTools.generateToken(userId, TokenType.ActivationToken)
        const url: string = `${this.configService.get<string>("App.activationOrigin")}/account/activate?t=${activationToken}`
        await this.mailService.sendEmail<UserCtaContext>(
            email,
            `${firstName}, completa la tua registrazione a Mercurion`,
            { firstName, url },
            join(__dirname, "../../../app_modules/notification/email-templates/confirmation.hbs")
        )
        return {
            ...this._r.ok('Registration performed successfully', HttpStatus.CREATED),
            obscuredEmail: this.securityService.maskEmail(email)
        }

    }

    public async activateUser(activationToken: string): Promise<ConfirmWithRecoveryCodeDTO> | never {

        return this.dataSource.manager.transaction(async (manager) => {
            const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(activationToken, TokenType.ActivationToken)
            await this.sessionService.revokeToken(jti)
            const user = await manager.findOne(User, { where: { id: userId } })
            if (user == null) {
                throw new RpcException('AccountActivation::User not found')
            }
            let { isVerified, email, unconfirmedEmail, updatedAt } = user
            const recoveryCode = this.securityService.generateAccountRecoveryReadableCode()
            const accountRecoveryCodeHash = await this.passwordEncoder.encode(recoveryCode)
            email = unconfirmedEmail!
            unconfirmedEmail = null
            isVerified = true
            updatedAt = Date.now()
            await manager.update(User, { id: userId }, { email, unconfirmedEmail, isVerified, updatedAt, accountRecoveryCodeHash })
            const now = Date.now()
            const firstMol = manager.create(ChEMBLMoleculeItemEntity, {
                chemblMolregno: 1280,
                name: 'ASPIRINA',
                nameEn: 'ASPIRIN',
                id: uuidv7() as UUID,
                userId,
                label: 'Acido acetilsalicilico',
                notes: 'La mia prima molecola su Mercurion',
                type: 'chembl',
                createdAt: now,
                updatedAt: now,
                touchedAt: now
            })
            const firstMolPersisted = await manager.save(firstMol)
            const firstCol = manager.create(MoleculeCollection, {
                id: uuidv7() as UUID,
                name: 'La mia prima collezione',
                createdAt: now,
                updatedAt: now,
                touchedAt: now,
                userId
            })
            const firstColPersisted = await manager.save(firstCol)
            const join = manager.create(MoleculeCollectionItemJoin, {
                id: uuidv7() as UUID,
                userId,
                collectionId: firstColPersisted.id,
                itemId: firstMolPersisted.id
            })
            await manager.save(join)
            await this.redisService.del(this.getRegistrationLockRedisKey(email))
            return {
                ...this._r.ok('Account activated successfully'),
                recoveryCode
            }
        })
    }

    public async changeEmail_firstStep_requestTotp(userId: UUID, newEmail: string): Promise<ConfirmChangeDTO> {

        const user = await this.userService.getUserById(userId)
        if (!user) throw new RpcException('ChangeEmail::UserNotFound')

        if (!newEmail || newEmail.trim() === '') throw new RpcException('ChangeEmail::EmptyEmail')
        if (newEmail.toLowerCase() === user.email?.toLowerCase()) {
            throw new RpcException('ChangeEmail::NewEmailIsCurrentEmail')
        }

        await this.throttleContactChangeSend(userId, ContactChangeKind.EMAIL)

        // Lock per evitare abusi e race condition
        const lockKey = `email_change_lock:${this.hmacKey(newEmail.toLowerCase())}`
        const exists = await this.redisService.exists(lockKey)
        if (exists) {
            throw new RpcException('ChangeEmail::EmailAlreadyInUseOrPending')
        }
        await this.redisService.set(lockKey, 'locked', 300)

        await this.userService.updateUser(userId, {
            unconfirmedEmail: newEmail,
            updatedAt: Date.now()
        })

        const emailVerificationToken = await this.jwtTools.generateToken(userId, TokenType.EmailVerificationToken)
        const { TOTP: totp, ...metadata } = this.securityService.generateTotp(user.otpSecret)

        await this.mailService.sendEmail<EmailTotpContext>(
            newEmail,
            `Conferma il tuo nuovo indirizzo email`,
            {
                firstName: user.firstName,
                period: this.configService.get<number>('Totp.period') as number,
                totp
            },
            join(__dirname, "../../../app_modules/notification/email-templates/email-verification.hbs")
        )

        const obscuredEmail = this.securityService.maskEmail(newEmail)

        return {
            ...this._r.ok(`Email change requested. Check ${obscuredEmail} for verification code`),
            obscuredEmail,
            emailVerificationToken,
            ...metadata
        }
    }

    public async changeEmail_secondStep_verifyTotp(totp: string, emailVerificationToken: string): Promise<ConfirmDTO> {

        const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(emailVerificationToken, TokenType.EmailVerificationToken)
        await this.sessionService.revokeToken(jti)

        await this.ensureContactChangeNotLocked(userId, ContactChangeKind.EMAIL)

        const user = await this.userService.getUserById(userId)
        if (!user) throw new RpcException('ChangeEmailConfirm::UserNotFound')
        if (!user.unconfirmedEmail) throw new RpcException('ChangeEmailConfirm::NoUnconfirmedEmail')

        const isTotpValid = this.securityService.verifyTotp(totp, user.otpSecret)
        if (!isTotpValid) {
            await this.registerContactChangeFailure(userId, ContactChangeKind.EMAIL)
            throw new RpcException('ChangeEmailConfirm::InvalidTotp')
        }

        await this.clearContactChangeFailures(userId, ContactChangeKind.EMAIL)

        const maskedOldEmail = this.securityService.maskEmail(user.email ?? '') || null
        const maskedNewEmail = this.securityService.maskEmail(user.unconfirmedEmail ?? '')
        const oldEmail = user.email
        const newEmail = user.unconfirmedEmail
        await this.userService.updateUser(userId, {
            email: newEmail,
            unconfirmedEmail: null,
            updatedAt: Date.now()
        })

        await this.redisService.del(`email_change_lock:${this.hmacKey(newEmail.toLowerCase())}`)

        await this.securityAuditService.emailChanged(userId, maskedOldEmail, maskedNewEmail)

        this.mailService.sendEmail<UserContext>(
            oldEmail!,
            'Mercurion: email modificata',
            {
                firstName: user.firstName
            },
            join(__dirname, "../../../app_modules/notification/email-templates/email-changed-old-contact.hbs")
        ).catch((e) => {
            this.logger.warn(`Errore durante l'invio mail email changed, oldEmail=${this.hmacKey(oldEmail ?? '')}, userId=${userId}`, e as string | object)
        })

        this.mailService.sendEmail<UserContext>(
            newEmail,
            'Mercurion: email modificata',
            {
                firstName: user.firstName
            },
            join(__dirname, "../../../app_modules/notification/email-templates/email-changed-new-contact.hbs")
        ).catch((e) => {
            this.logger.warn(`Errore durante l'invio mail email changed, newEmail=${this.hmacKey(newEmail)}, userId=${userId}`, e as string | object)
        })

        return this._r.ok('Email successfully changed and verified')
    }

    public async deletePhoneNumber_firstStep_requestTotp(userId: UUID): Promise<ConfirmChangeDTO> {
        const user = await this.userService.getUserById(userId)
        if (!user) {
            throw new RpcException('DeletePhone::UserNotFound')
        }
        const currentNumber = user.completePhoneNumber
        if (!currentNumber) {
            throw new RpcException('DeletePhone::NoPhoneNumber')
        }
        const lockKey = `phone_change_lock:${this.hmacKey(currentNumber)}`
        const existsLock = await this.redisService.exists(lockKey)
        if (existsLock) {
            throw new RpcException('DeletePhone::NumberAlreadyUsedOrPending')
        }
        await this.redisService.set(lockKey, 'locked', 300)
        await this.userService.updateUser(userId, {
            unconfirmedPhoneNumber: null,
            unconfirmedPhoneNumberPrefixLength: 0,
            updatedAt: Date.now()
        })

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
            ...metadata
        }

    }

    public async changePhoneNumber_firstStep_requestTotp(userId: UUID, dto: ChangePhoneDTO): Promise<ConfirmChangeDTO> {


        const { internationalPrefix, phoneNumber } = dto
        const user = await this.userService.getUserById(userId)
        if (!user) {
            throw new RpcException('ChangePhone::UserNotFound')
        }
        await this.throttleContactChangeSend(userId, ContactChangeKind.PHONE)

        const fullNumber = `${internationalPrefix ?? ''}${phoneNumber ?? ''}`
        const currentNumber = user.completePhoneNumber

        if (fullNumber === currentNumber) {
            throw new RpcException('ChangePhone::NumberAlreadySet')
        }

        // lock per evitare abusi e race condition
        const lockKey = `phone_change_lock:${this.hmacKey(fullNumber)}`
        const existsLock = await this.redisService.exists(lockKey)
        if (existsLock) {
            throw new RpcException('ChangePhone::NumberAlreadyUsedOrPending')
        }

        await this.redisService.set(lockKey, 'locked', 300)

        await this.userService.updateUser(userId, {
            unconfirmedPhoneNumber: fullNumber,
            unconfirmedPhoneNumberPrefixLength: internationalPrefix.length,
            updatedAt: Date.now()
        })

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
            ...metadata
        }

    }

    public async changePhoneNumber_secondStep_verifyTotp(totp: string, token: string): Promise<ConfirmDTO> {

        const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(token, TokenType.PhoneNumberVerificationToken)

        await this.sessionService.revokeToken(jti)

        await this.ensureContactChangeNotLocked(userId, ContactChangeKind.PHONE)

        const user = await this.userService.getUserById(userId)
        if (!user) throw new RpcException('ChangePhone::UserNotFound')

        if (!user.unconfirmedPhoneNumber || !user.unconfirmedPhoneNumberPrefixLength)
            throw new RpcException('ChangePhone::NoPendingChange')

        const isTotpValid = this.securityService.verifyTotp(totp, user.otpSecret)
        if (!isTotpValid) {
            await this.registerContactChangeFailure(userId, ContactChangeKind.PHONE)
            throw new RpcException('ChangePhone::InvalidTOTP')
        }
        const maskedOldPhone = this.securityService.maskPhone(user.completePhoneNumber ?? '') || null
        const maskedNewPhone = this.securityService.maskPhone(user.unconfirmedPhoneNumber ?? '')
        const oldCompletePhoneNumber = user.completePhoneNumber
        const newCompletePhoneNumber = user.unconfirmedPhoneNumber
        const newPhoneNumberPrefixLength = user.unconfirmedPhoneNumberPrefixLength


        await this.userService.updateUser(userId, {
            completePhoneNumber: newCompletePhoneNumber,
            phoneNumberPrefixLength: newPhoneNumberPrefixLength,
            unconfirmedPhoneNumber: null,
            unconfirmedPhoneNumberPrefixLength: 0,
            updatedAt: Date.now()
        })

        await this.redisService.del(`phone_change_lock:${this.hmacKey(newCompletePhoneNumber)}`)
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
        await this.ensurePasswordNotLocked(userId, PasswordContext.CHANGE)
        const oldPasswordHash = await this.userService.getVerifiedUserPasswordHashById(userId)
        if (await this.passwordEncoder.compareWithFallback(oldPassword, oldPasswordHash) === CompareResult.NoMatch) {
            await this.registerPasswordFailure(userId, PasswordContext.CHANGE)
            throw new RpcException('Unauthenticated')
        }
        await this.clearPasswordFailures(userId, PasswordContext.CHANGE)
        await this.userService.changePassword(userId, newPassword)
        await this.securityAuditService.passwordChanged(userId, { viaResetFlow: false })
        const email = (await this.userService.getUserEmailById(userId))!
        const firstName = (await this.userService.getUserFirstNameById(userId))!
        this.mailService.sendEmail<UserContext>(
            email,
            'Mercurion: password modificata',
            {
                firstName
            },
            join(__dirname, "../../../app_modules/notification/email-templates/password-changed-notification.hbs")
        ).catch((e) => {
            this.logger.warn(`Errore durante l'invio email password changed, userId=${userId}`, e as string | object)
        })
    }

    public async sendForgottenPasswordLink(email: string): Promise<void> | never {
        const userId = await this.userService.getUserIdByEmail(email)
        if (!userId) {
            throw new RpcException('Unauthenticated')
        }
        await this.throttlePasswordResetSend(userId as UUID, PasswordContext.RESET_SEND)
        const changePasswordToken = await this.jwtTools.generateToken(userId as UUID, TokenType.ChangePasswordToken)
        const firstName = await this.userService.getUserFirstNameById(userId as UUID)
        const url = `${this.configService.get<string>("App.activationOrigin")}/password-recovery?t=${encodeURIComponent(changePasswordToken)}`
        await this.mailService.sendEmail<UserCtaContext>(
            email,
            'Mercurion: recupero password',
            {
                url,
                firstName: firstName ?? 'Utente'
            },
            join(__dirname, "../../../app_modules/notification/email-templates/forgotten-password.hbs")
        )
    }

    public async forgottenPassword(newPassword: string, changePasswordToken: string): Promise<void> | never {
        const { sub: userId } = await this.jwtTools.verifyTokenAndGetPayload(
            changePasswordToken,
            TokenType.ChangePasswordToken
        )
        const sessions = await this.sessionService.getAllSessionsByUserId(userId as string, { onlyValid: false })
        for (const s of sessions) {
            await this.sessionService.revokeAllTokensBySessionId(s.sessionId)
        }
        for (const s of sessions) {
            await this.sessionService.destroySessionByOwner(s.sessionId, s.userId)
        }
        await this.userService.changePassword(userId, newPassword)
        await this.clearPasswordFailures(userId, PasswordContext.CHANGE)
        await this.securityAuditService.passwordChanged(userId, { viaResetFlow: true })
        const email = (await this.userService.getUserEmailById(userId))!
        const firstName = (await this.userService.getUserFirstNameById(userId))!
        this.mailService.sendEmail<UserContext>(
            email,
            'Mercurion: password modificata',
            {
                firstName
            },
            join(__dirname, "../../../app_modules/notification/email-templates/password-changed-notification.hbs")
        ).catch((e) => {
            this.logger.warn(`Errore durante l'invio email password changed, userId=${userId}`, e as string | object)
        })
    }


    public async isAuthorizedToRecoverPassword(changePasswordToken: string): Promise<boolean> {

        let jti: UUID
        try {
            ({ jti } = await this.jwtTools.verifyTokenAndGetPayload(changePasswordToken, TokenType.ChangePasswordToken))
            const redisKey = `changePasswordLock:${jti}`
            if (await this.redisService.exists(redisKey)) {
                return false
            }
            await this.redisService.set(redisKey, '1', this.CHANGE_PASSWORD_TOKEN_EXPIRATION_MS / 1000)
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
        return this.dataSource.manager.transaction(async (manager) => {

            await this.ensureRecoveryNotLocked(code)

            const getTrue = () => true

            const BATCH_SIZE = 5_000

            let lastId: UUID | null = null
            let userId: UUID | null = null

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
                        userId = row.id
                        break
                    }
                }

                if (userId) break

                // aggiorna cursore per batch successivo
                lastId = batch[batch.length - 1].id
            }

            if (!userId) {
                await this.registerRecoveryFailure(code)
                throw new RpcException('AccountRecovery::wrong recovery code')
            }

            const user = await manager.findOne(User, { where: { id: userId } })
            if (!user) {
                await this.registerRecoveryFailure(code)
                throw new RpcException('AccountRecovery::wrong recovery code')
            }

            await this.redisService.del(this.getRecoveryFailKey(code))
            await this.redisService.del(this.getRecoveryLockKey(code))

            user.locked = true
            user.mfaStrategies = '[]'
            user.recoveryMode = true

            await manager.save(user)

            await manager.delete(MfaBackupCode, { userId })
            await this.sessionService.destroyAllSessionsAndRevokeAllTokensByUserId(userId)
            await this.securityAuditService.accountRecovery(
                userId,
                'ACCOUNT_RECOVERY_TOKEN_GENERATED'
            )

            return this.jwtTools.generateToken(userId, TokenType.AccountRecoveryToken)
        })
    }

    public async recoverAccount_secondStep(dto: RecoverCredentialsDTO, secureToken: string): Promise<string> | never {
        return this.dataSource.manager.transaction(async (manager) => {
            const { newEmail, newPassword } = dto
            let userId: UUID
            let jti: UUID
            
            try {
                ({ sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(secureToken, TokenType.AccountRecoveryToken))
            } catch (e) {
                this.logger.debug(`recoverAccount_secondStep > error in secure_token validation: `, (e.stack ?? e) as object)
                throw new RpcException('Unauthenticated')
            }
            await this.sessionService.revokeToken(jti)
            const user = await manager.findOne(User, {
                where: {
                    id: userId
                }
            })
            await this.ensureRecoverySecondNotLocked(userId)
            if (!user || !user.accountRecoveryCodeHash) {
                await this.registerRecoverySecondFailure(userId)
                throw new RpcException('Unauthenticated')
            }
            const newRecoveryCode = this.securityService.generateAccountRecoveryReadableCode()
            const newAccountRecoveryCodeHash = await this.passwordEncoder.encode(newRecoveryCode)
            const newPasswordHash = await this.passwordEncoder.encode(newPassword)
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
            await manager.save(user)
            await this.clearRecoverySecondFailures(userId)
            return newRecoveryCode
        })

    }

}
