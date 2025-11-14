import { SessionService } from 'src/app_modules/auth/services/session.service';
import { SecureCookieService } from './../services/secure-cookie.service';
import { FastifyReply, FastifyRequest } from 'fastify';
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, LoggerService, Param, Patch, Post, Query, Req, Res, UnauthorizedException, UseGuards, ValidationPipe } from '@nestjs/common';
import { Login_FirstStepDTO } from '../Models/DTO/login-first-step.cls.dto';
import { MfaService } from '../services/mfa.service';
import { AuthenticationService } from '../services/authentication.service';
import { SessionId, Authorization, ClientIp, DeviceId, DeviceInfo, Fingerprint, Public, AuthenticatedUserId } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { Authentication } from '../Models/interfaces/authentication.interface';
import { ResponseService } from 'src/services/response.service';
import { Confirm_Login_FirstStepDTO, ConfirmDTO, ConfirmWithTokenPairAndInitialsDTO, ConfirmWithTotpMetaDTO } from 'src/Models/confirm-responses.dto';
import { TestPhoneDTO } from '../Models/DTO/test-phone.cls.dto';
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { TotpBodyDTO } from '../Models/DTO/totp.cls.dto';
import { JwtToolsService } from '../services/jwt-tools.service';
import { TokenType } from '../Models/enums/token-type.enum';
import { EmailDTO } from '../Models/DTO/email.cls.dto';
import { ISessionDeviceInfo } from '../Models/interfaces/i-session.interface';
import { FingerprintData } from '../Models/DTO/fingerprints.dtos';
import { UserService } from 'src/app_modules/user/services/user.service';
import { TurnstileGuard } from '../guards/turnstile.guard';
import { ConfigService } from '@nestjs/config';
import { CookieConfiguration, SecureCookieConfiguration } from 'src/config/config.types';
import { SignedSessionIdDTO } from '../Models/DTO/signed-session-id.dto';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';



@Controller('authentication')
export class AuthenticationController {

    private readonly logger: LoggerService

    private readonly cookieConf: CookieConfiguration
    private readonly LONG_SESSION_TTL: number

    constructor(
        private readonly authService: AuthenticationService,
        private readonly mfaService: MfaService,
        private readonly jwtTools: JwtToolsService,
        private readonly _r: ResponseService,
        private readonly secureCookieService: SecureCookieService,
        private readonly userService: UserService,
        private readonly configService: ConfigService,
        private readonly sessionService: SessionService,
        private readonly redisService: RedisService,
        meiliLogger: MeiliLoggerService
    ) {
        this.logger = meiliLogger.forContext(AuthenticationController.name)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { secret, ...cookieConf } = this.configService.get<SecureCookieConfiguration>('SecureCookie')!
        this.cookieConf = cookieConf
        this.LONG_SESSION_TTL = this.configService.get<number>('Session.persistentSessionLasting')!
    }

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
    @UseGuards(TurnstileGuard)
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

        const auth: Authentication = await this.authService.emailAndPasswordAuthentication(email, password, remember, ip, deviceId, sessionDeviceInfo, fingerprintData)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { userId, sessionId, ...authRes } = auth

        this.secureCookieService.setSignedCookie(reply, '__node_session_id', sessionId, {
            ...this.cookieConf,
            maxAge: remember ? this.LONG_SESSION_TTL : undefined
        })

        const initials = await this.userService.getUserInitialsByUserId(userId)

        if (await this.mfaService.isMfaEnabled(auth.userId) || auth.suspiciousAttempt) {
            reply.setCookie('__logged_in', remember ? 'pending_long' : 'pending_short', {
                ...this.cookieConf,
                maxAge: remember ? this.LONG_SESSION_TTL : undefined,
                httpOnly: false
            })
            return {
                ...this._r.ok('MFA first step went on successfully'),
                ...authRes,
                preAuthorizationToken: await this.authService.performPreAuthenticationForMfa(auth),
                initials: initials ?? ''
            }
        }
        reply.setCookie('__logged_in', 'true', {
            ...this.cookieConf,
            maxAge: remember ? this.LONG_SESSION_TTL : undefined,
            httpOnly: false
        })

        return {
            ...this._r.ok('Authenticated successfully'),
            ...authRes,
            ...await this.authService.performAuthentication(auth, fingerprintData, ip),
            initials: initials ?? ''
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
        @ClientIp() ip: string,
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) reply: FastifyReply,
        @DeviceId() actualDeviceId: UUID
    ): Promise<ConfirmWithTokenPairAndInitialsDTO> {

        const loginPendingVal = req.cookies['__logged_in'] ?? ''
        const maxAge = loginPendingVal === 'pending_long' ? this.LONG_SESSION_TTL : undefined
        let userId: UUID
        let sessionId: UUID
        let jti: UUID
        try {
            ({ sub: userId, sid: sessionId, jti } = await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken))
        } catch {
            throw new UnauthorizedException()
        }
        const expectedDev = await this.redisService.get(`mfa:pat:dev:${jti}`)
        if (expectedDev && expectedDev !== actualDeviceId) {
            await this.sessionService.revokeToken(jti)
            throw new UnauthorizedException('MfaDeviceMismatch')
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
        const { accessToken, ws_accessToken } = await this.authService.performAuthentication({ userId, sessionId }, fingerprintData, ip, trustVerify)
        reply.setCookie('__logged_in', 'true', {
            ...this.cookieConf,
            maxAge,
            httpOnly: false
        })
        return {
            ...this._r.ok('Authenticated successfully'),
            accessToken,
            ws_accessToken,
            initials: await this.userService.getUserInitialsByUserId(userId) ?? ''
        }

    }

    @Public()
    @HttpCode(HttpStatus.NO_CONTENT)
    @Delete('/logout')
    public async logout(
        @SessionId() sessionId: UUID,
        @DeviceId() deviceId: UUID,
        @Res({ passthrough: true }) reply: FastifyReply
    ): Promise<void> {
        try {
            await this.authService.performLogout(sessionId, deviceId)
        } catch {
            // do nothing
        }
        this.secureCookieService.clearCookie(reply, '__node_session_id')
        reply.clearCookie('__logged_in')
        // this.logger.debug('Logged out. Response with status 204 - No Content')
    }


    @Patch('/logout-from-session')
    public async logoutFromSession(
        @AuthenticatedUserId() userId: UUID,
        @Body(new ValidationPipe({ transform: true })) { signedSessionId }: SignedSessionIdDTO
    ): Promise<ConfirmDTO> {
        await this.sessionService.destroySessionAndRevokeAllTokensBySignedSessionId(signedSessionId, userId)
        return this._r.ok('Action performed successfully')
    }


    @Patch('/logout-from-all-sessions')
    public async logoutFromAllSessions(
        @AuthenticatedUserId() userId: UUID
    ): Promise<ConfirmDTO> {
        await this.sessionService.destroyAllSessionsAndRevokeAllTokensByUserId(userId)
        return this._r.ok('Action performed successfully')
    }


    @Get('/ws-refresh')
    public async refreshWs_accessToken(
        @AuthenticatedUserId() userId: UUID,
        @SessionId() sessionId: UUID
    ): Promise<string> {
        return this.jwtTools.generateToken(userId, TokenType.ws_AccessToken, sessionId)
    }

    @Public()
    @Post('/login/backup/3')
    @HttpCode(HttpStatus.OK)
    public async login_thirdStep_backupCode(
        @Authorization() preAuthorizationToken: string,
        @Body('code') code: string,
        @Fingerprint() fingerprintData: FingerprintData,
        @ClientIp() ip: string,
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) reply: FastifyReply,
        @DeviceId() actualDeviceId: UUID
    ): Promise<ConfirmWithTokenPairAndInitialsDTO> {

        const loginPendingVal = req.cookies['__logged_in'] ?? ''
        const maxAge = loginPendingVal === 'pending_long' ? this.LONG_SESSION_TTL : undefined

        let userId: UUID
        let sessionId: UUID
        let jti: UUID

        try {
            ({ sub: userId, sid: sessionId, jti } = await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken))
        } catch {
            throw new UnauthorizedException()
        }

        const expectedDev = await this.redisService.get(`mfa:pat:dev:${jti}`)
        if (expectedDev && expectedDev !== actualDeviceId) {
            await this.sessionService.revokeToken(jti)
            throw new UnauthorizedException('MfaDeviceMismatch')
        }

        const ok = await this.mfaService.verifyBackupCode(userId, code)
        await this.sessionService.revokeToken(jti)

        if (!ok) {
            throw new UnauthorizedException('InvalidBackupCode')
        }

        const { accessToken, ws_accessToken } = await this.authService.performAuthentication({ userId, sessionId }, fingerprintData, ip)

        reply.setCookie('__logged_in', 'true', {
            ...this.cookieConf,
            maxAge,
            httpOnly: false
        })

        return {
            ...this._r.ok('Authenticated successfully (backup code)'),
            accessToken,
            ws_accessToken,
            initials: (await this.userService.getUserInitialsByUserId(userId)) ?? ''
        }
    }


}
