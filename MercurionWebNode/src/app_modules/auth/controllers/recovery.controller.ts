import { Body, Controller, HttpCode, HttpStatus, Post, Res, UseGuards, ValidationPipe } from '@nestjs/common';
import { RecoveryCodeDTO } from '../Models/DTO/recovery-code.cls.dto';
import { ConfirmWithRecoveryCodeDTO, ConfirmWithRecoveryTokenDTO } from 'src/Models/confirm-responses.dto';
import { AccountService } from '../services/account.service';
import { ResponseService } from 'src/services/response.service';
import { Authorization, Public } from 'src/metadata/metadata';
import { TurnstileGuard } from '../guards/turnstile.guard';
import { RecoverCredentialsDTO } from '../Models/DTO/recover-cretentials.cls.dto';
import { FastifyReply } from 'fastify';
import { SecureCookieService } from '../services/secure-cookie.service';
import { randomUUID } from 'crypto';
import { CookieConfiguration, SecureCookieConfiguration } from 'src/config/config.types';
import { ConfigService } from '@nestjs/config';

@Controller('recovery')
export class RecoveryController {

    private readonly cookieConf: CookieConfiguration

    constructor(
        private readonly accountService: AccountService,
        private readonly secureCookieService: SecureCookieService,
        private readonly configService: ConfigService,
        private readonly _r: ResponseService
    ) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { secret: _omit, ...cookieConf } = this.configService.get<SecureCookieConfiguration>('SecureCookie')!
        this.cookieConf = cookieConf
    }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('/1')
    @UseGuards(TurnstileGuard)
    public async accountRecovery_firstStep(
        @Body(new ValidationPipe({ transform: true })) { code }: RecoveryCodeDTO
    ): Promise<ConfirmWithRecoveryTokenDTO> {
        return {
            ...this._r.ok('Account recovery first step went on successfully'),
            recoveryToken: await this.accountService.recoverAccount_firstStep(code)
        }
    }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('/2')
    @UseGuards(TurnstileGuard)
    public async accountRecovery_second(
        @Body(new ValidationPipe({ transform: true })) dto: RecoverCredentialsDTO,
        @Authorization() secureToken: string,
        @Res({ passthrough: true }) reply: FastifyReply
    ): Promise<ConfirmWithRecoveryCodeDTO> {
        // Reset del deviceId => Al primo login verrà sicuramente forzata l'mfa con OTP sulla nuova e-mail
        this.secureCookieService.setSignedCookie(reply, '__device_id', randomUUID(), {
            ...this.cookieConf,
            maxAge: 31_556_952
        })
        return {
            ...this._r.ok('Account recovery second step went on successfully'),
            recoveryCode: await this.accountService.recoverAccount_secondStep(dto, secureToken)
        }
    }

}
