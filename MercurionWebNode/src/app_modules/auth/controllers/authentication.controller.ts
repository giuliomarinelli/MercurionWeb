import { Body, Controller, HttpCode, HttpStatus, Ip, Post, Req } from '@nestjs/common';
import { Login_FirstStepDTO } from '../Models/DTO/login-first-step.cls.dto';
import { MfaService } from '../services/mfa.service';
import { AuthenticationService } from '../services/authentication.service';
import { FastifyRequest } from 'fastify/types/request';
import { DeviceId } from 'src/metadata/metadata';
import { UUID } from 'crypto';

@Controller('authentication')
export class AuthenticationController {

    constructor(
        private readonly authService: AuthenticationService,
        private readonly mfaService: MfaService
    ) { }

    @Post('login/1')
    @HttpCode(HttpStatus.OK)
    public async loginStep1(
        @Body() dto: Login_FirstStepDTO,
        @Ip() ip: string,
        @DeviceId() deviceId: UUID
    ) {

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


        const auth = await this.authService.emailAndPasswordAuthentication(email, password, remember, ip, deviceId, sessionDeviceInfo)

        if (await this.mfaService.isMfaEnabled(auth.userId)) {
            const token = await this.authService.performPreAuthenticationForMfa(auth)
            return { requiresMfa: true, secureToken: token }
            return {
                requiresMfa: false,
                ...(await this.authService.performAuthentication(auth))
            }
        }


    }

}
