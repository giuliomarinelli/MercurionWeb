import { ConfigService } from '@nestjs/config';
import { HttpStatus, Injectable } from '@nestjs/common';
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
import { UserActivationContext } from 'src/app_modules/notification/Models/contexts/user-activation.context';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { RpcException } from '@nestjs/microservices';
import { User } from 'src/app_modules/user/Models/entities/user.entity';
import { UUID } from 'crypto';
import { EmailTotpContext } from 'src/app_modules/notification/Models/contexts/email-totp.context';
import { SessionService } from './session.service';
import { SmsSenderService } from 'src/app_modules/notification/services/sms-sender/sms-sender.service';
import { ChangePhoneDTO } from '../Models/DTO/change-phone.cls.dto';

@Injectable()
export class AccountService {

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
        private readonly _r: ResponseService
    ) { }

    public async register(registerDTO: UserRegisterDTO): Promise<ConfirmWithObsContDTO> {

        const { password, email, firstName, lastName } = registerDTO
        const emailKey = `email_registration_lock:${email.toLowerCase()}`
        const ttlSeconds = 2 * 60 * 60; // 2 ore
        const alreadyExists = await this.redisService.exists(emailKey) || await this.userService.existsUserByEmail(email)
        if (alreadyExists) {
            throw new RpcException('UserRegistrationConflict::Email already exists')
        }
        await this.redisService.set(emailKey, 'locked', ttlSeconds);
        const passwordHash = await this.passwordEncoder.encode(password)
        const otpSecret = this.securityService.generateOtpSecret()
        const { id: userId } = await this.userService.createUser({
            passwordHash,
            otpSecret,
            unconfirmedEmail: email,
            firstName,
            lastName,
            scopes: this.userService.STD_SCOPES
        })
        const activationToken: string = await this.jwtTools.generateToken(userId, TokenType.ActivationToken)
        const url: string = `${this.configService.get<string>("App.activationOrigin")}/account/activate?t=${activationToken}`
        await this.mailService.sendEmail<UserActivationContext>(
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

        const { sub: userId } = await this.jwtTools.verifyTokenAndGetPayload(activationToken, TokenType.ActivationToken)
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
        await this.redisService.del(`email_registration_lock:${email.toLowerCase()}`)
        return this._r.ok('Account activated successfully')
    }

    public async changeEmail_firstStep_requestTotp(userId: UUID, newEmail: string): Promise<ConfirmChangeDTO> {

        const user = await this.userService.getUserById(userId)
        if (!user) throw new RpcException('ChangeEmail::UserNotFound')

        if (!newEmail || newEmail.trim() === '') throw new RpcException('ChangeEmail::EmptyEmail')
        if (newEmail.toLowerCase() === user.email?.toLowerCase())
            throw new RpcException('ChangeEmail::NewEmailIsCurrentEmail')

        // Lock per evitare abusi
        const lockKey = `email_change_lock:${newEmail.toLowerCase()}`
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

        const user = await this.userService.getUserById(userId)
        if (!user) throw new RpcException('ChangeEmailConfirm::UserNotFound')
        if (!user.unconfirmedEmail) throw new RpcException('ChangeEmailConfirm::NoUnconfirmedEmail')

        const isTotpValid = this.securityService.verifyTotp(totp, user.otpSecret)
        if (!isTotpValid) throw new RpcException('ChangeEmailConfirm::InvalidTotp')

        const emailToConfirm = user.unconfirmedEmail
        await this.userService.updateUser(userId, {
            email: emailToConfirm,
            unconfirmedEmail: null,
            updatedAt: Date.now()
        })

        await this.redisService.del(`email_change_lock:${emailToConfirm.toLowerCase()}`)

        return this._r.ok('Email successfully changed and verified')
    }

    public async changePhoneNumber_firstStep_requestTotp(userId: UUID, dto: ChangePhoneDTO): Promise<ConfirmChangeDTO> {

        const { internationalPrefix, phoneNumber } = dto
        const user = await this.userService.getUserById(userId)
        if (!user) throw new RpcException('ChangePhone::UserNotFound')

        const fullNumber = `${internationalPrefix}${phoneNumber}`
        const currentNumber = user.completePhoneNumber

        if (fullNumber === currentNumber) {
            throw new RpcException('ChangePhone::NumberAlreadySet')
        }

        const lockKey = `phone_change_lock:${fullNumber}`
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

        const user = await this.userService.getUserById(userId)
        if (!user) throw new RpcException('ChangePhone::UserNotFound')

        if (!user.unconfirmedPhoneNumber || !user.unconfirmedPhoneNumberPrefixLength)
            throw new RpcException('ChangePhone::NoPendingChange')

        const isTotpValid = this.securityService.verifyTotp(totp, user.otpSecret)
        if (!isTotpValid) throw new RpcException('ChangePhone::InvalidTOTP')

        const completePhoneNumber = user.unconfirmedPhoneNumber
        const phoneNumberPrefixLength = user.unconfirmedPhoneNumberPrefixLength

        await this.userService.updateUser(userId, {
            completePhoneNumber,
            phoneNumberPrefixLength,
            unconfirmedPhoneNumber: null,
            unconfirmedPhoneNumberPrefixLength: 0,
            updatedAt: Date.now()
        })

        await this.redisService.del(`phone_change_lock:${completePhoneNumber}`)

        return this._r.ok('Phone number successfully updated')

    }



}
