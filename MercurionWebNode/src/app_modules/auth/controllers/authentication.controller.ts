import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Ip, Param, Post, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Login_FirstStepDTO } from '../Models/DTO/login-first-step.cls.dto';
import { MfaService } from '../services/mfa.service';
import { AuthenticationService } from '../services/authentication.service';
import { Authorization, DeviceId, Public } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { Authentication } from '../Models/interfaces/authentication.interface';
import { ResponseService } from 'src/services/response.service';
import { Confirm_Login_FirstStepDTO, ConfirmWithAccessTokenDTO, ConfirmWithTotpMetaDTO } from 'src/Models/confirm-responses.dto';
import { TestPhoneDTO } from '../Models/DTO/test-phone.cls.dto';
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';
import { GeneralUtils } from 'src/general-utils/general-utils';
import { TotpDTO } from '../Models/DTO/totp.cls.dto';
import { JwtToolsService } from '../services/jwt-tools.service';
import { TokenType } from '../Models/enums/token-type.enum';

@Controller('authentication')
export class AuthenticationController {

    constructor(
        private readonly authService: AuthenticationService,
        private readonly mfaService: MfaService,
        private readonly jwtTools: JwtToolsService,
        private readonly _r: ResponseService
    ) { }

    @Public()
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

    @Public()
    @Post('/login/:strategy/2')
    @HttpCode(HttpStatus.OK)
    public async login_secondStep(
        @Authorization() preAuthorizationToken: string,
        @Param('strategy') strategyKey: string,
        @Body(new ValidationPipe({ transform: true })) dto: TestPhoneDTO = { completePhoneNumber: '' }
    ): Promise<ConfirmWithTotpMetaDTO> {
        try {
            await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken)
        } catch {
            throw new UnauthorizedException()
        }
        const strategy: MfaStrategy | undefined = GeneralUtils.getEnumValue(MfaStrategy, strategyKey)
        if (!strategy || strategy === MfaStrategy.APP_TOTP) {
            throw new BadRequestException('Invalid MFA strategy')
        }
        const { generatedAt, expiresAt } = await this.mfaService.sendOtpToUser(preAuthorizationToken, strategy, dto.completePhoneNumber)
        return {
            ...this._r.ok(`OTP successfully sent to user with strategy ${strategyKey}`),
            generatedAt,
            expiresAt
        }
    }

    @Public()
    @Post('/login/:strategy/3')
    @HttpCode(HttpStatus.OK)
    public async login_thirdStep(
        @Authorization() preAuthorizationToken: string,
        @Param('strategy') strategyKey: string,
        @Body(new ValidationPipe({ transform: true })) dto: TotpDTO
    ): Promise<ConfirmWithAccessTokenDTO> {

        let userId: UUID
        let sessionId: UUID
        try {
            ({ sub: userId, sid: sessionId } = await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken))
        } catch {
            throw new UnauthorizedException()
        }
        const { totp } = dto
        const strategy: MfaStrategy | undefined = GeneralUtils.getEnumValue(MfaStrategy, strategyKey)
        if (!strategy) {
            throw new BadRequestException('Invalid MFA strategy')
        }
        const isTotpValid: boolean = await this.mfaService.verifyUserOtpOrAppTotp(totp, preAuthorizationToken, strategy)
        if (!isTotpValid) {
            throw new UnauthorizedException('Invalid MFA OTP')
        }
        const accessToken: string = await this.authService.performAuthentication({ userId, sessionId })
        return {
            ...this._r.ok('Authenticated successfully'),
            accessToken
        }

    }

}
