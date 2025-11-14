import { ConfigService } from '@nestjs/config';
import { HttpStatus, Injectable, LoggerService } from '@nestjs/common';
import { UserRegisterDTO } from 'src/app_modules/user/Models/DTO/user-register.cls.dto';
import { UserService } from 'src/app_modules/user/services/user.service';
import { ConfirmChangeDTO, ConfirmDTO, ConfirmWithObsContDTO } from 'src/Models/confirm-responses.dto';
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
import { SecurityAuditService } from 'src/app_modules/meilisearch/services/security-audit/security-audit.service';
import { UserContext } from 'src/app_modules/notification/Models/contexts/user.context';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';




@Injectable()
export class AccountService {

    private readonly logger: LoggerService

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
            scopes: this.userService.STD_SCOPES,
            initials,
            job: (job ?? '').trim() ? job : null,
            gender
        })
        const activationToken: string = await this.jwtTools.generateToken(userId, TokenType.ActivationToken)
        const url: string = `${this.configService.get<string>("App.activationOrigin")}/account/activate?t=${activationToken}`
        await this.mailService.sendEmail<UserCtaContext>(
            email,
            `${firstName}, completa la tua registrazione a Mercurion`, // ${this.configService.get<string>("App.globalName")}
            { firstName, url },
            join(__dirname, "../../../app_modules/notification/email-templates/confirmation.hbs")
        )
        return {
            ...this._r.ok('Registration performed successfully', HttpStatus.CREATED),
            obscuredEmail: this.securityService.maskEmail(email)
        }

    }

    public async activate(activationToken: string): Promise<ConfirmDTO> | never {

        const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(activationToken, TokenType.ActivationToken)
        await this.sessionService.revokeToken(jti)
        const user = await this.userService.getUserById(userId)
        if (user == null) {
            throw new RpcException('AccountActivation::User not found')
        }
        let { isVerified, email, unconfirmedEmail, updatedAt } = user
        email = unconfirmedEmail as string
        unconfirmedEmail = null
        isVerified = true
        updatedAt = Date.now()
        await this.userService.updateUser(userId, { email, unconfirmedEmail, isVerified, updatedAt }) as User
        await this.redisService.del(this.getRegistrationLockRedisKey(email))
        return this._r.ok('Account activated successfully')
    }

    public async changeEmail_firstStep_requestTotp(userId: UUID, newEmail: string): Promise<ConfirmChangeDTO> {

        const user = await this.userService.getUserById(userId)
        if (!user) throw new RpcException('ChangeEmail::UserNotFound')

        if (!newEmail || newEmail.trim() === '') throw new RpcException('ChangeEmail::EmptyEmail')
        if (newEmail.toLowerCase() === user.email?.toLowerCase())
            throw new RpcException('ChangeEmail::NewEmailIsCurrentEmail')


        await this.throttleContactChangeSend(userId, ContactChangeKind.EMAIL)

        // Lock per evitare abusi e race condition
        const lockKey = `email_change_lock:${this.hmacKey(newEmail.toLowerCase())}`
        const exists = await this.redisService.exists(lockKey)
        if (exists) throw new RpcException('ChangeEmail::EmailAlreadyInUseOrPending')

        await this.redisService.set(lockKey, 'locked', 3600) // 1h TTL

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
            this.logger.warn(`Errore durante l'invio mail email changed, oldEmail=${oldEmail}, userId=${userId}`, e)
        })

        this.mailService.sendEmail<UserContext>(
            newEmail,
            'Mercurion: email modificata',
            {
                firstName: user.firstName
            },
            join(__dirname, "../../../app_modules/notification/email-templates/email-changed-new-contact.hbs")
        ).catch((e) => {
            this.logger.warn(`Errore durante l'invio mail email changed, newEmail=${newEmail}, userId=${userId}`, e)
        })

        return this._r.ok('Email successfully changed and verified')
    }

    public async changePhoneNumber_firstStep_requestTotp(userId: UUID, dto: ChangePhoneDTO): Promise<ConfirmChangeDTO> {


        const { internationalPrefix, phoneNumber } = dto
        const user = await this.userService.getUserById(userId)
        if (!user) throw new RpcException('ChangePhone::UserNotFound')
        await this.throttleContactChangeSend(userId, ContactChangeKind.PHONE)

        const fullNumber = `${internationalPrefix}${phoneNumber}`
        const currentNumber = user.completePhoneNumber

        if (fullNumber === currentNumber) {
            throw new RpcException('ChangePhone::NumberAlreadySet')
        }

        // lock per evitare abusi e race condition
        const lockKey = `phone_change_lock:${this.hmacKey(fullNumber)}`
        const existsLock = await this.redisService.exists(lockKey)
        if (existsLock) throw new RpcException('ChangePhone::NumberAlreadyUsedOrPending')

        await this.redisService.set(lockKey, 'locked', 3600) // 1h TTL

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
            ...this._r.ok(`Phone number change requested. Check ${fullNumber} for verification code.`),
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
                this.logger.warn(`Errore durante l'invio sms phone changed, oldPhone=${oldCompletePhoneNumber}, userId=${userId}`, e)
            })
        }

        this.smsService.sendSms(newCompletePhoneNumber, newNotificationBody).catch((e) => {
            this.logger.warn(`Errore durante l'invio sms phone changed, newPhone=${newCompletePhoneNumber}, userId=${userId}`, e)
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
            this.logger.warn(`Errore durante l'invio email password changed, userId=${userId}`, e)
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
            this.logger.warn(`Errore durante l'invio email password changed, userId=${userId}`, e)
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

}
