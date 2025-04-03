import { Body, Controller, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import { Login_FirstStepDTO } from '../Models/DTO/login-first-step.cls.dto';
import { MfaService } from '../services/mfa.service';
import { AuthenticationService } from '../services/authentication.service';
import { DeviceId } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { Authentication } from '../Models/interfaces/authentication.interface';
import { ResponseService } from 'src/services/response.service';
import { Confirm_Login_FirstStepDTO } from 'src/Models/confirm-responses.dto';

@Controller('authentication')
export class AuthenticationController {

    constructor(
        private readonly authService: AuthenticationService,
        private readonly mfaService: MfaService,
        private readonly _r: ResponseService
    ) { }

    @Post('login/1')
    @HttpCode(HttpStatus.OK)
    public async login_firstStep(
        @Body() dto: Login_FirstStepDTO,
        @Ip() ip: string,
        @DeviceId() deviceId: UUID
    ): Promise<Confirm_Login_FirstStepDTO> {

        const { email, password, remember } = dto

        // TODO: placeholder, da implementare passaggio dei dati via richiesta
        const sessionDeviceInfo = {
            osPlatform: 'Win32',
            useragent: '---',
            browser: {
                name: 'Netscape',
                version: '3'
            }
        }

        const auth: Authentication = await this.authService.emailAndPasswordAuthentication(email, password, remember, ip, deviceId, sessionDeviceInfo)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { userId, sessionId, ...authRes } = auth

        if (await this.mfaService.isMfaEnabled(auth.userId)) {
            const preAuthorizationToken = await this.authService.performPreAuthenticationForMfa(auth)
            return {
                ...this._r.ok('MFA first step went on successfully'),
                ...authRes,
                preAuthorizationToken
            }
        }

        return {
            ...this._r.ok('Authenticated successfully'),
            ...authRes,
            accessToken: await this.authService.performAuthentication(auth)
        }

    }

}
