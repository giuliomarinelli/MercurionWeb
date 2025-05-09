import { SecureCookieService } from './../services/secure-cookie.service';
import { FastifyReply } from 'fastify';
import { BadRequestException, Body, Controller, Delete, HttpCode, HttpStatus, Logger, Param, Post, Query, Res, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Login_FirstStepDTO } from '../Models/DTO/login-first-step.cls.dto';
import { MfaService } from '../services/mfa.service';
import { AuthenticationService } from '../services/authentication.service';
import { SessionId, Authorization, ClientIp, DeviceId, DeviceInfo, Fingerprint, Public } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { Authentication } from '../Models/interfaces/authentication.interface';
import { ResponseService } from 'src/services/response.service';
import { Confirm_Login_FirstStepDTO, ConfirmDTO, ConfirmWithAccessTokenDTO, ConfirmWithTotpMetaDTO } from 'src/Models/confirm-responses.dto';
import { TestPhoneDTO } from '../Models/DTO/test-phone.cls.dto';
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';
import { GeneralUtils } from 'src/general-utils/general-utils';
import { TotpBodyDTO } from '../Models/DTO/totp.cls.dto';
import { JwtToolsService } from '../services/jwt-tools.service';
import { TokenType } from '../Models/enums/token-type.enum';
import { EmailDTO } from '../Models/DTO/change-email.cls.dto';
import { ISessionDeviceInfo } from '../Models/interfaces/i-session.interface';
import { FingerprintData } from '../Models/DTO/fingerprints.dtos';



@Controller('authentication')
export class AuthenticationController {

    private readonly logger = new Logger(AuthenticationController.name)

    constructor(
        private readonly authService: AuthenticationService,
        private readonly mfaService: MfaService,
        private readonly jwtTools: JwtToolsService,
        private readonly _r: ResponseService,
        private readonly secureCookieService: SecureCookieService
    ) { }

    @Public()
    @Post('login/0')
    @HttpCode(HttpStatus.OK)
    public async login_zeroStep(@Body(new ValidationPipe({ transform: true })) { email }: EmailDTO): Promise<ConfirmDTO> {
        if (!await this.authService.verifyEmail(email)) {
            throw new UnauthorizedException()
        }
        return this._r.ok('Email successfully verified')
    }

    @Public()
    @Post('login/1')
    @HttpCode(HttpStatus.OK)
    public async login_firstStep(
        @Body() dto: Login_FirstStepDTO,
        @ClientIp() ip: string,
        @DeviceId() deviceId: UUID,
        @DeviceInfo() sessionDeviceInfo: ISessionDeviceInfo,
        @Fingerprint() fingerprintData: FingerprintData,
        @Res({ passthrough: true }) reply: FastifyReply
    ): Promise<Confirm_Login_FirstStepDTO> {

        // eslint-disable-next-line prefer-const
        let { email, password, remember } = dto

        if (remember) {
            remember = false
        }

        const auth: Authentication = await this.authService.emailAndPasswordAuthentication(email, password, remember, ip, deviceId, sessionDeviceInfo, fingerprintData)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { userId, sessionId, ...authRes } = auth

        this.secureCookieService.setSignedCookie(reply, '__node_session_id', sessionId)

        if (await this.mfaService.isMfaEnabled(auth.userId) || auth.suspiciousAttempt) {
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
            accessToken: await this.authService.performAuthentication(auth, fingerprintData, ip)
        }

    }

    @Public()
    @Post('/login/:strategy/2')
    @HttpCode(HttpStatus.OK)
    public async login_secondStep(
        @Query('trust_verify') trustVerify: boolean = false,
        @Authorization() preAuthorizationToken: string,
        @Param('strategy') strategyKey: string,
        @Body(new ValidationPipe({ transform: true })) dto: TestPhoneDTO = { completePhoneNumber: '' }
    ): Promise<ConfirmWithTotpMetaDTO> {
        try {
            await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken)
        } catch {
            throw new UnauthorizedException()
        }
        const strategy: MfaStrategy | undefined = GeneralUtils.getEnumValueFromStringKey(MfaStrategy, strategyKey)
        if (!strategy || strategy === MfaStrategy.APP_TOTP) {
            throw new BadRequestException('Invalid MFA strategy')
        }
        const { generatedAt, expiresAt } = await this.mfaService.sendOtpToUser(preAuthorizationToken, strategy, trustVerify, dto.completePhoneNumber)
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
        @Query('trust_verify') trustVerify: boolean = false,
        @Authorization() preAuthorizationToken: string,
        @Param('strategy') strategyKey: string,
        @Body(new ValidationPipe({ transform: true })) dto: TotpBodyDTO,
        @Fingerprint() fingerprintData: FingerprintData,
        @ClientIp() ip: string
    ): Promise<ConfirmWithAccessTokenDTO> {

        let userId: UUID
        let sessionId: UUID
        try {
            ({ sub: userId, sid: sessionId } = await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken))
        } catch {
            throw new UnauthorizedException()
        }
        const { totp } = dto
        const strategy: MfaStrategy | undefined = GeneralUtils.getEnumValueFromStringKey(MfaStrategy, strategyKey)
        if (!strategy) {
            throw new BadRequestException('Invalid MFA strategy')
        }
        const isTotpValid: boolean = await this.mfaService.verifyUserOtpOrAppTotp(totp, preAuthorizationToken, strategy)
        if (!isTotpValid) {
            throw new UnauthorizedException('Invalid MFA OTP')
        }
        const accessToken: string = await this.authService.performAuthentication({ userId, sessionId }, fingerprintData, ip, trustVerify)
        return {
            ...this._r.ok('Authenticated successfully'),
            accessToken
        }

    }

    @Public()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('/logout')
    public async logout(
        @SessionId() sessionId: UUID,
        @DeviceId() deviceId: UUID
    ): Promise<void> {
        await this.authService.performLogout(sessionId, deviceId)
        this.logger.log('Logged out. Response with status 204 - No Content')
    }

}
