import { ConfigService } from '@nestjs/config';
import { HttpStatus, Injectable } from '@nestjs/common';
import { UserRegisterDTO } from 'src/app_modules/user/Models/DTO/user-register.cls.dto';
import { UserService } from 'src/app_modules/user/services/user.service';
import { ConfirmWithObsContDTO } from 'src/Models/confirm-responses.dto';
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

@Injectable()
export class AccountService {

    constructor(
        private readonly userService: UserService,
        private readonly passwordEncoder: PasswordEncoderService,
        private readonly securityService: SercurityService,
        private readonly jwtTools: JwtToolsService,
        private readonly configService: ConfigService,
        private readonly mailService: MailSenderService,
        private readonly redisService: RedisService,
        private readonly _r: ResponseService
    ) { }

    public async register(registerDTO: UserRegisterDTO): Promise<ConfirmWithObsContDTO> {

        const { password, email, firstName, lastName } = registerDTO
        const emailKey = `email_registration_lock:${email.toLowerCase()}`
        const ttlSeconds = 2 * 60 * 60; // 2 ore
        const alreadyExists = await this.redisService.exists(emailKey)
        if (alreadyExists) {
            throw new RpcException('UserRegistrationConflict::Email already exists')
        }
        await this.redisService.set(emailKey, 'locked', ttlSeconds);
        const passwordHash = await this.passwordEncoder.encode(password)
        const totpSecret = this.securityService.generateTotpSecret()
        const { id: userId } = await this.userService.createUser({ passwordHash, totpSecret, unconfirmedEmail: email, lastName })
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

}
