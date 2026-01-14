import { SessionService } from 'src/app_modules/auth/services/session.service';
import { SecureCookieService } from './../services/secure-cookie.service';
import { FastifyReply, FastifyRequest } from 'fastify';
import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Req, Res, UnauthorizedException, UseGuards, ValidationPipe } from '@nestjs/common';
import { Login_FirstStepDTO } from '../Models/DTO/login-first-step.cls.dto';
import { MfaService } from '../services/mfa.service';
import { AuthenticationService } from '../services/authentication.service';
import { SessionId, Authorization, ClientIp, DeviceId, DeviceInfo, Fingerprint, Public, AuthenticatedUserId } from 'src/metadata/metadata';
import { UUID } from 'crypto';
import { Authentication } from '../Models/interfaces/authentication.interface';
import { ResponseService } from 'src/services/response.service';
import { Confirm_Login_FirstStepDTO, ConfirmDTO, ConfirmWithTokenPairAndInitialsDTO, ConfirmWithTotpMetaDTO } from 'src/Models/confirm-responses.dto';
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
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
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { TypeGuards } from 'src/utils/type-guards/type-guards';
import { VerifyBodyDTO } from '../Models/DTO/verify-body.cls.dto.';
import { VerifyBodyPipe } from '../validation-pipes/verify-body.pipe';
import { VerifyKind } from '../Models/enums/verify-kind.enum';
import { BackupCodeDTO } from '../Models/DTO/backup-code.cls.dto';
import { TotpBodyDTO } from '../Models/DTO/totp.cls.dto';
import { SercurityService } from '../services/sercurity.service';
import { AuthProvider } from 'src/app_modules/sso/Models/enums/auth-provider.enum';




@Controller('authentication')
export class AuthenticationController {

    private readonly logger: MeiliContextLogger

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
        private readonly securityService: SercurityService,
        loggerFactory: MeiliLoggerService
    ) {
        this.logger = loggerFactory.forContext(AuthenticationController.name)
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
        const { userId, sessionId, deviceId: _omit, ...authRes } = auth

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
                initials: initials ?? '',
                deviceId: this.securityService.signDeviceId(deviceId)
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
            initials: initials ?? '',
            deviceId: this.securityService.signDeviceId(deviceId)
        }

    }

    @Public()
    @Post('/login/:strategy/2')
    @HttpCode(HttpStatus.OK)
    public async login_secondStep(
        @Query('trust_verify') trustVerify: boolean = false,
        @Authorization() preAuthorizationToken: string,
        @Param('strategy') strategyKey: string
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
        const { generatedAt, expiresAt } = await this.mfaService.sendOtpToUser(preAuthorizationToken, strategy, trustVerify)
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
        @Body(new VerifyBodyPipe()) body: VerifyBodyDTO,
        @Fingerprint() fingerprintData: FingerprintData,
        @ClientIp() ip: string,
        @Req() req: FastifyRequest,
        @Res({ passthrough: true }) reply: FastifyReply,
        @DeviceId() actualDeviceId: UUID
    ): Promise<ConfirmWithTokenPairAndInitialsDTO> {

        const loginPendingVal = req.cookies['__logged_in'] ?? ''
        let shouldPersistLogin = loginPendingVal === 'pending_long'
        let userId: UUID
        let sessionId: UUID
        let jti: UUID
        try {
            // Nota: questa verifica è una ridondanza intenzionale. Permette di aggiungere un layer di sicurezza in più ed evitare un possibile stato di "unico punto di rottura"
            ({ sub: userId, sid: sessionId, jti } = await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken))
        } catch {
            try {
                await this.jwtTools.verifyTokenAndGetPayload(preAuthorizationToken, TokenType.PreAuthorizationToken, true)
                throw new UnauthorizedException('ExpiredPreauthorizationToken')
            } catch (e) {
                this.logger.warn(` > login_thirdStep > Error: ${e.message || e}`)
                throw new UnauthorizedException('InvalidPreauthorizationToken')
            }
        }
        if (!shouldPersistLogin) {
            shouldPersistLogin = await this.sessionService.isSessionLongTerm(sessionId, userId)
        }
        const maxAge = shouldPersistLogin ? this.LONG_SESSION_TTL : undefined
        const expectedDev = await this.redisService.get(`mfa:pat:dev:${jti}`)
        if (expectedDev && expectedDev !== actualDeviceId) {
            await this.sessionService.revokeToken(jti)
            throw new UnauthorizedException('MfaDeviceMismatch')
        }
        let code: string

        if (body.kind === VerifyKind.TOTP) {
            code = (body.payload as TotpBodyDTO).totp
        } else if (body.kind === VerifyKind.BACKUP) {
            code = (body.payload as BackupCodeDTO).code
        } else {
            throw new ForbiddenException('Forbidden::missing permissions')
        }
        const strategy: MfaStrategy | undefined = GeneralUtils.getEnumValueFromStringKey(MfaStrategy, strategyKey)
        if (!TypeGuards.isMfaStrategy(strategy)) {
            throw new BadRequestException('Invalid MFA strategy')
        }
        const isVerificationOk: boolean = strategy !== MfaStrategy.BACKUP_CODE
            ?
            await this.mfaService.verifyUserOtpOrAppTotp(code, preAuthorizationToken, strategy)
            :
            await this.mfaService.verifyBackupCode(code, preAuthorizationToken)
        if (!isVerificationOk) {
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
            initials: await this.userService.getUserInitialsByUserId(userId) ?? '',
            deviceId: this.securityService.signDeviceId(actualDeviceId)
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
            // pass
        }
        this.secureCookieService.clearCookie(reply, '__node_session_id')
        this.secureCookieService.clearCookie(reply, '__logged_in')
        reply.clearCookie('__logged_in')
    }


    @Patch('/logout-from-session')
    public async logoutFromSession(
        @AuthenticatedUserId() userId: UUID,
        @Body(new ValidationPipe({ transform: true })) { signedSessionId }: SignedSessionIdDTO,
        @Res({ passthrough: true }) reply: FastifyReply
    ): Promise<ConfirmDTO> {
        await this.sessionService.destroySessionAndRevokeAllTokensBySignedSessionId(signedSessionId, userId)
        this.secureCookieService.clearCookie(reply, '__node_session_id')
        this.secureCookieService.clearCookie(reply, '__logged_in')
        return this._r.ok('Action performed successfully')
    }

    @Patch('/logout-from-all-sessions')
    public async logoutFromAllSessions(
        @AuthenticatedUserId() userId: UUID,
        @Res({ passthrough: true }) reply: FastifyReply
    ): Promise<ConfirmDTO> {
        await this.sessionService.destroyAllSessionsAndRevokeAllTokensByUserId(userId)
        this.secureCookieService.clearCookie(reply, '__node_session_id')
        this.secureCookieService.clearCookie(reply, '__logged_in')
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
    @Post('/sso/:provider/authorize-flow')
    @HttpCode(HttpStatus.OK)
    public async authorize_sso(
        @ClientIp() IP: string,
        @Fingerprint() fd: FingerprintData,
        @DeviceInfo() di: ISessionDeviceInfo,
        @Authorization() sso_pat: string,
        @DeviceId() deviceId: UUID,
        @Param('provider') provider: string,
        @Res({ passthrough: true }) reply: FastifyReply
    ): Promise<ConfirmWithTokenPairAndInitialsDTO> {
        try {
            if (TypeGuards.isAuthProvider(provider) && provider !== AuthProvider.Mercurion) {
                const maxAge = this.LONG_SESSION_TTL
                const { sub: userId } = await this.jwtTools.verifyTokenAndGetPayload(sso_pat, TokenType.SSO_PreAuthorizationToken)
                const { accessToken, ws_accessToken, sessionId } = await this.authService.perform_SSO_Authentication(sso_pat, IP, deviceId, di, fd, provider)
                this.secureCookieService.setSignedCookie(reply, '__node_session_id', sessionId, {
                    ...this.cookieConf,
                    maxAge
                })
                reply.setCookie('__logged_in', 'true', {
                    ...this.cookieConf,
                    maxAge,
                    httpOnly: false
                })
                return {
                    ...this._r.ok(`Authenticated successfully, oauth2_provider=${provider}`),
                    accessToken,
                    ws_accessToken,
                    deviceId: this.securityService.signDeviceId(deviceId),
                    initials: await this.userService.getUserInitialsByUserId(userId) ?? ''
                }
            }
            throw new BadRequestException('Invalid oauth2_provider')
        } catch {
            throw new UnauthorizedException()
        }
    }
}
