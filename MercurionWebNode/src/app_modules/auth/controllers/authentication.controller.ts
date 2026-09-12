import {
    Body,
    BadRequestException,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Patch,
    Post,
    Query,
    Req,
    Res,
    NotFoundException,
    UnauthorizedException,
    UseGuards,
    ValidationPipe
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UUID } from 'crypto'
import { FastifyReply, FastifyRequest } from 'fastify'
import {
    LOCAL_DUMMY_AUTH,
    type FingerprintData,
    type SessionDeviceInfo
} from '@mercurion/rest-contracts'

import {
    AuthenticatedUserId,
    Authorization,
    ClientIp,
    DeviceId,
    DeviceInfo,
    Fingerprint,
    Public,
    SessionId
} from 'src/metadata/metadata'
import {
    Confirm_Login_FirstStepDTO,
    ConfirmDTO,
    ConfirmWithTokenPairAndInitialsDTO,
    ConfirmWithTotpMetaDTO
} from 'src/Models/confirm-responses.dto'
import { ResponseService } from 'src/services/response.service'
import {
    CookieConfiguration,
    SecureCookieConfiguration
} from 'src/config/config.types'

import {
    CredentialLoginHandler,
    VerifyEmailHandler
} from '../application/credential-authentication.handlers'
import { LocalDummyLoginHandler } from '../application/local-dummy-login.handler'
import {
    CompleteMfaLoginHandler,
    StartMfaChallengeHandler
} from '../application/mfa-authentication.handlers'
import {
    LogoutHandler,
    RefreshWsAccessTokenHandler,
    RevokeAllSessionsHandler,
    RevokeSessionHandler
} from '../application/session-authentication.handlers'
import { CompleteSsoAuthenticationHandler } from '../application/sso-authentication.handler'
import { EmailDTO } from '../Models/DTO/email.cls.dto'
import { Login_FirstStepDTO } from '../Models/DTO/login-first-step.cls.dto'
import { SignedSessionIdDTO } from '../Models/DTO/signed-session-id.dto'
import { VerifyBodyDTO } from '../Models/DTO/verify-body.cls.dto.'
import { TurnstileGuard } from '../guards/turnstile.guard'
import { SecureCookieService } from '../services/secure-cookie.service'
import { VerifyBodyPipe } from '../validation-pipes/verify-body.pipe'

@Controller('authentication')
export class AuthenticationController {
    private readonly cookieConf: CookieConfiguration
    private readonly LONG_SESSION_TTL: number

    constructor(
        private readonly verifyEmail: VerifyEmailHandler,
        private readonly credentialLogin: CredentialLoginHandler,
        private readonly startMfaChallenge: StartMfaChallengeHandler,
        private readonly completeMfaLogin: CompleteMfaLoginHandler,
        private readonly logoutHandler: LogoutHandler,
        private readonly revokeSession: RevokeSessionHandler,
        private readonly revokeAllSessions: RevokeAllSessionsHandler,
        private readonly refreshWsAccessToken: RefreshWsAccessTokenHandler,
        private readonly completeSsoAuthentication: CompleteSsoAuthenticationHandler,
        private readonly localDummyLoginHandler: LocalDummyLoginHandler,
        private readonly response: ResponseService,
        private readonly secureCookieService: SecureCookieService,
        configService: ConfigService
    ) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { secret, ...cookieConf } =
            configService.get<SecureCookieConfiguration>('SecureCookie')!
        this.cookieConf = cookieConf
        this.LONG_SESSION_TTL =
            configService.get<number>('Session.persistentSessionLasting')!
    }

    @Public()
    @Post('local-dummy')
    @HttpCode(HttpStatus.OK)
    public async localDummyLogin(
        @Req() req: FastifyRequest,
        @ClientIp() ip: string,
        @DeviceId() deviceId: UUID,
        @DeviceInfo() sessionDeviceInfo: SessionDeviceInfo,
        @Fingerprint() fingerprintData: FingerprintData,
        @Res({ passthrough: true }) reply: FastifyReply
    ): Promise<ConfirmWithTokenPairAndInitialsDTO> {
        const result = await this.localDummyLoginHandler.execute({
            requestHeaders: req.headers,
            deviceId,
            ip,
            sessionDeviceInfo,
            fingerprintData
        })
        if (result.outcome === 'not-found') {
            throw new NotFoundException()
        }
        this.secureCookieService.setSignedCookie(
            reply,
            '__node_session_id',
            result.sessionId,
            {
                ...this.cookieConf,
                maxAge: this.LONG_SESSION_TTL
            }
        )
        reply.setCookie('__logged_in', 'true', {
            ...this.cookieConf,
            maxAge: this.LONG_SESSION_TTL,
            httpOnly: false
        })
        return {
            ...this.response.ok('Local dummy authenticated successfully'),
            accessToken: result.accessToken,
            ws_accessToken: result.ws_accessToken,
            initials: LOCAL_DUMMY_AUTH.initials,
            deviceId: result.signedDeviceId
        }
    }

    @Public()
    @Post('login/0')
    @HttpCode(HttpStatus.OK)
    public async login_zeroStep(
        @Body(new ValidationPipe({ transform: true })) { email }: EmailDTO
    ): Promise<ConfirmDTO> {
        const result = await this.verifyEmail.execute({ email })
        if (!result.verified) {
            throw new UnauthorizedException()
        }
        return this.response.ok('Email successfully verified')
    }

    @Public()
    @Post('login/1')
    @HttpCode(HttpStatus.OK)
    @UseGuards(TurnstileGuard)
    public async login_firstStep(
        @Body() dto: Login_FirstStepDTO,
        @ClientIp() ip: string,
        @DeviceId() deviceId: UUID,
        @DeviceInfo() sessionDeviceInfo: SessionDeviceInfo,
        @Fingerprint() fingerprintData: FingerprintData,
        @Res({ passthrough: true }) reply: FastifyReply
    ): Promise<Confirm_Login_FirstStepDTO> {
        const result = await this.credentialLogin.execute({
            ...dto,
            ip,
            deviceId,
            sessionDeviceInfo,
            fingerprintData
        })
        this.secureCookieService.setSignedCookie(
            reply,
            '__node_session_id',
            result.sessionId,
            {
                ...this.cookieConf,
                maxAge: result.remember ? this.LONG_SESSION_TTL : undefined
            }
        )
        const authResult = {
            needsMfa: result.needsMfa,
            enabledMfaStrategies: result.enabledMfaStrategies,
            obscuredEmail: result.obscuredEmail,
            obscuredPhoneNumber: result.obscuredPhoneNumber,
            suspiciousAttempt: result.suspiciousAttempt,
            initials: result.initials,
            deviceId: result.signedDeviceId
        }

        if (result.next === 'mfa') {
            reply.setCookie(
                '__logged_in',
                result.remember ? 'pending_long' : 'pending_short',
                {
                    ...this.cookieConf,
                    maxAge: result.remember ? this.LONG_SESSION_TTL : undefined,
                    httpOnly: false
                }
            )
            return {
                ...this.response.ok('MFA first step went on successfully'),
                ...authResult,
                preAuthorizationToken: result.preAuthorizationToken
            }
        }

        reply.setCookie('__logged_in', 'true', {
            ...this.cookieConf,
            maxAge: result.remember ? this.LONG_SESSION_TTL : undefined,
            httpOnly: false
        })
        return {
            ...this.response.ok('Authenticated successfully'),
            ...authResult,
            accessToken: result.accessToken,
            ws_accessToken: result.ws_accessToken
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
        const result = await this.startMfaChallenge.execute({
            trustVerify,
            preAuthorizationToken,
            strategyKey
        })
        if (result.outcome === 'invalid-token') {
            throw new UnauthorizedException()
        }
        if (result.outcome === 'invalid-strategy') {
            throw new BadRequestException('Invalid MFA strategy')
        }
        return {
            ...this.response.ok(
                `OTP successfully sent to user with strategy ${strategyKey}`
            ),
            generatedAt: result.generatedAt,
            expiresAt: result.expiresAt
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
        const result = await this.completeMfaLogin.execute({
            trustVerify,
            preAuthorizationToken,
            strategyKey,
            body,
            fingerprintData,
            ip,
            actualDeviceId,
            loginPendingValue: req.cookies['__logged_in'] ?? ''
        })
        if (result.outcome === 'invalid-strategy') {
            throw new BadRequestException('Invalid MFA strategy')
        }
        reply.setCookie('__logged_in', 'true', {
            ...this.cookieConf,
            maxAge: result.persistLogin ? this.LONG_SESSION_TTL : undefined,
            httpOnly: false
        })
        return {
            ...this.response.ok('Authenticated successfully'),
            accessToken: result.accessToken,
            ws_accessToken: result.ws_accessToken,
            initials: result.initials,
            deviceId: result.signedDeviceId
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
        await this.logoutHandler.execute({ sessionId, deviceId })
        this.secureCookieService.clearCookie(reply, '__node_session_id')
        this.secureCookieService.clearCookie(reply, '__logged_in')
        reply.clearCookie('__logged_in')
    }

    @Patch('/logout-from-session')
    public async logoutFromSession(
        @AuthenticatedUserId() userId: UUID,
        @Body(new ValidationPipe({ transform: true }))
        { signedSessionId }: SignedSessionIdDTO,
        @SessionId() currentSessionId: UUID,
        @Res({ passthrough: true }) reply: FastifyReply
    ): Promise<ConfirmDTO> {
        const result = await this.revokeSession.execute({
            userId,
            signedSessionId,
            currentSessionId
        })
        if (result.revokedCurrentSession) {
            this.secureCookieService.clearCookie(reply, '__node_session_id')
            this.secureCookieService.clearCookie(reply, '__logged_in')
        }
        return this.response.ok('Action performed successfully')
    }

    @Patch('/logout-from-all-sessions')
    public async logoutFromAllSessions(
        @AuthenticatedUserId() userId: UUID,
        @Res({ passthrough: true }) reply: FastifyReply
    ): Promise<ConfirmDTO> {
        await this.revokeAllSessions.execute({ userId })
        this.secureCookieService.clearCookie(reply, '__node_session_id')
        this.secureCookieService.clearCookie(reply, '__logged_in')
        return this.response.ok('Action performed successfully')
    }

    @Get('/ws-refresh')
    public async refreshWs_accessToken(
        @AuthenticatedUserId() userId: UUID,
        @SessionId() sessionId: UUID
    ): Promise<string> {
        const result = await this.refreshWsAccessToken.execute({
            userId,
            sessionId
        })
        return result.wsAccessToken
    }

    @Public()
    @Post('/sso/:provider/authorize-flow')
    @HttpCode(HttpStatus.OK)
    public async authorize_sso(
        @ClientIp() ip: string,
        @Fingerprint() fingerprintData: FingerprintData,
        @DeviceInfo() sessionDeviceInfo: SessionDeviceInfo,
        @Authorization() ssoPreAuthorizationToken: string,
        @DeviceId() deviceId: UUID,
        @Param('provider') provider: string,
        @Res({ passthrough: true }) reply: FastifyReply
    ): Promise<ConfirmWithTokenPairAndInitialsDTO> {
        try {
            const result = await this.completeSsoAuthentication.execute({
                ssoPreAuthorizationToken,
                ip,
                deviceId,
                sessionDeviceInfo,
                fingerprintData,
                provider
            })
            if (result.outcome === 'invalid-provider') {
                throw new BadRequestException('Invalid oauth2_provider')
            }
            if (result.outcome === 'unauthorized') {
                throw new UnauthorizedException()
            }
            this.secureCookieService.setSignedCookie(
                reply,
                '__node_session_id',
                result.sessionId,
                {
                    ...this.cookieConf,
                    maxAge: this.LONG_SESSION_TTL
                }
            )
            reply.setCookie('__logged_in', 'true', {
                ...this.cookieConf,
                maxAge: this.LONG_SESSION_TTL,
                httpOnly: false
            })
            return {
                ...this.response.ok(
                    `Authenticated successfully, oauth2_provider=${result.provider}`
                ),
                accessToken: result.accessToken,
                ws_accessToken: result.ws_accessToken,
                deviceId: result.signedDeviceId,
                initials: result.initials
            }
        } catch {
            throw new UnauthorizedException()
        }
    }
}
