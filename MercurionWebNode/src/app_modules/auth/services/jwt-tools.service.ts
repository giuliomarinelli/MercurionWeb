import { Inject, Injectable, forwardRef } from '@nestjs/common';
import { JwtService, JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { JwtAudience, JwtConfiguration } from 'src/config/config.types';
import { ConfigService } from '@nestjs/config';
import { TokenType } from '../Models/enums/token-type.enum';
import { randomUUID, UUID } from 'crypto';
import { UserService } from 'src/app_modules/user/services/user.service';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { Scope } from 'src/app_modules/user/Models/enums/scope.enum';
import { FastifyRequest } from 'fastify';
import { RpcException } from '@nestjs/microservices';
import { AppJwtPayload } from '../Models/interfaces/app-jwt-payload.interface';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { SessionService } from './session.service';
import { MeiliContextLogger } from 'src/app_modules/meilisearch/Models/interfaces/meili-context-logger.interface';
import { MeiliLoggerService } from 'src/app_modules/meilisearch/services/meili-logger.service';
import { JwtKeysProvider } from '../providers/jwt-keys.provider';

@Injectable()
export class JwtToolsService {

    private readonly logger: MeiliContextLogger

    private readonly accessTokenConfig: JwtConfiguration = { expiresInMs: 0 }
    private readonly ws_accessTokenConfig: JwtConfiguration = { expiresInMs: 0 }
    private readonly preAuthorizationTokenConfig: JwtConfiguration
    private readonly activationTokenConfig: JwtConfiguration
    private readonly phoneNumberVerificationTokenConfig: JwtConfiguration
    private readonly emailVerificationTokenConfig: JwtConfiguration
    private readonly emailOtpMfaActivationTokenConfig: JwtConfiguration
    private readonly smsOtpMfaActivationTokenConfig: JwtConfiguration
    private readonly appTotpMfaActivationTokenConfig: JwtConfiguration
    private readonly emailOtpMfaInactivationTokenConfig: JwtConfiguration
    private readonly smsOtpMfaInactivationTokenConfig: JwtConfiguration
    private readonly appTotpMfaInactivationTokenConfig: JwtConfiguration
    private readonly changePasswordTokenConfig: JwtConfiguration
    private readonly accountRecoveryTokenConfig: JwtConfiguration
    private readonly sso_preAuthorizationTokenConfig: JwtConfiguration

    private readonly jwtIssuer: string
    private readonly jwtAudience: JwtAudience

    private readonly privateKey: string
    private readonly publicKey: string
    private readonly ws_privateKey: string
    private readonly ws_publicKey: string

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => UserService))
        private readonly userService: UserService,
        private readonly redisservice: RedisService,
        private readonly sessionService: SessionService,
        loggerFactory: MeiliLoggerService,
        private readonly jwtKeys: JwtKeysProvider
    ) {
        this.logger = loggerFactory.forContext(JwtToolsService.name)

        this.accessTokenConfig.expiresInMs = this.configService.get<number>('Jwt.accessToken.expiresInMs') as number
        this.ws_accessTokenConfig.expiresInMs = this.configService.get<number>('Jwt.ws_accessToken.expiresInMs') as number

        this.preAuthorizationTokenConfig = this.configService.get<JwtConfiguration>('Jwt.preAuthorizationToken') as JwtConfiguration
        this.activationTokenConfig = this.configService.get<JwtConfiguration>('Jwt.activationToken') as JwtConfiguration
        this.phoneNumberVerificationTokenConfig = this.configService.get<JwtConfiguration>('Jwt.phoneNumberVerificationToken') as JwtConfiguration
        this.emailVerificationTokenConfig = this.configService.get<JwtConfiguration>('Jwt.emailVerificationToken') as JwtConfiguration
        this.emailOtpMfaActivationTokenConfig = this.configService.get<JwtConfiguration>('Jwt.emailOtpMfaActivationToken') as JwtConfiguration
        this.smsOtpMfaActivationTokenConfig = this.configService.get<JwtConfiguration>('Jwt.smsOtpMfaActivationToken') as JwtConfiguration
        this.appTotpMfaActivationTokenConfig = this.configService.get<JwtConfiguration>('Jwt.appTotpMfaActivationToken') as JwtConfiguration
        this.emailOtpMfaInactivationTokenConfig = this.configService.get<JwtConfiguration>('Jwt.emailOtpMfaInactivationToken') as JwtConfiguration
        this.smsOtpMfaInactivationTokenConfig = this.configService.get<JwtConfiguration>('Jwt.smsOtpMfaInactivationToken') as JwtConfiguration
        this.appTotpMfaInactivationTokenConfig = this.configService.get<JwtConfiguration>('Jwt.appTotpMfaInactivationToken') as JwtConfiguration
        this.changePasswordTokenConfig = this.configService.get<JwtConfiguration>('Jwt.changePasswordToken') as JwtConfiguration
        this.accountRecoveryTokenConfig = this.configService.get<JwtConfiguration>('Jwt.accountRecoveryToken') as JwtConfiguration
        this.sso_preAuthorizationTokenConfig = this.configService.get<JwtConfiguration>('Jwt.sso_preAuthorizationToken') as JwtConfiguration

        this.jwtIssuer = this.configService.get<string>('Jwt.issuer') as string
        this.jwtAudience = this.configService.get<JwtAudience>('Jwt.audience')!

        if (!this.jwtIssuer) {
            throw new Error('Missing Jwt.issuer in config')
        }
        if (!this.jwtAudience?.access || !this.jwtAudience?.ws || !this.jwtAudience?.auth) {
            throw new Error('Missing Jwt.audience in config')
        }

        const minLen = 48 // 384 bit per HS512
            ;[
                this.preAuthorizationTokenConfig,
                this.activationTokenConfig,
                this.phoneNumberVerificationTokenConfig,
                this.emailVerificationTokenConfig,
                this.emailOtpMfaActivationTokenConfig,
                this.smsOtpMfaActivationTokenConfig,
                this.appTotpMfaActivationTokenConfig,
                this.emailOtpMfaInactivationTokenConfig,
                this.smsOtpMfaInactivationTokenConfig,
                this.appTotpMfaInactivationTokenConfig,
                this.changePasswordTokenConfig,
                this.accountRecoveryTokenConfig,
                this.sso_preAuthorizationTokenConfig
            ].forEach(c => {
                if (!c?.secret || c.secret.length < minLen) {
                    throw new Error('Weak JWT secret in config')
                }
            })

        const accessKeys = this.jwtKeys.getAccessKeyPair()
        this.privateKey = accessKeys.privateKey
        this.publicKey = accessKeys.publicKey

        const wsKeys = this.jwtKeys.getWsKeyPair()
        this.ws_privateKey = wsKeys.privateKey
        this.ws_publicKey = wsKeys.publicKey
    }

    private getJwtConfigurationFromTokenType(type: TokenType): JwtConfiguration {
        switch (type) {
            case TokenType.AccessToken: return this.accessTokenConfig
            case TokenType.ws_AccessToken: return this.ws_accessTokenConfig
            case TokenType.PreAuthorizationToken: return this.preAuthorizationTokenConfig
            case TokenType.ActivationToken: return this.activationTokenConfig
            case TokenType.PhoneNumberVerificationToken: return this.phoneNumberVerificationTokenConfig
            case TokenType.EmailVerificationToken: return this.emailVerificationTokenConfig
            case TokenType.AppTotpMfaActivationToken: return this.appTotpMfaActivationTokenConfig
            case TokenType.AppTotpMfaInactivationToken: return this.appTotpMfaInactivationTokenConfig
            case TokenType.EmailOtpMfaActivationToken: return this.emailOtpMfaActivationTokenConfig
            case TokenType.EmailOtpMfaInactivationToken: return this.emailOtpMfaInactivationTokenConfig
            case TokenType.SmsOtpMfaActivationToken: return this.smsOtpMfaActivationTokenConfig
            case TokenType.SmsOtpMfaInactivationToken: return this.smsOtpMfaInactivationTokenConfig
            case TokenType.ChangePasswordToken: return this.changePasswordTokenConfig
            case TokenType.AccountRecoveryToken: return this.accountRecoveryTokenConfig
            case TokenType.SSO_PreAuthorizationToken: return this.sso_preAuthorizationTokenConfig
        }
    }

    // TODO: valutare la necessità di implementazione del claim kid per rotazione secrets => Previsto per Mercurion 1.x
    public async generateToken(userId: UUID, type: TokenType, sessionId?: UUID): Promise<string> {
        const jwtConfig = this.getJwtConfigurationFromTokenType(type)
        const scopes: string[] = await this.userService.getUserScopesById(userId) ?? []
        const scp = scopes
            .map((s) => GeneralUtils.getEnumKeyByValue(Scope, s))
            .filter((k) => k !== undefined)
            .join(' ')


        // 🔹 Usa RS256 per gli AccessToken, HS512 per gli altri
        let signOptions: JwtSignOptions
        let aud: string
        if (type === TokenType.AccessToken) {
            signOptions = { algorithm: "RS256", privateKey: this.privateKey }
            aud = this.jwtAudience.access
        } else if (type === TokenType.ws_AccessToken) {
            signOptions = { algorithm: "RS256", privateKey: this.ws_privateKey }
            aud = this.jwtAudience.ws
        } else {
            signOptions = { algorithm: "HS512", secret: jwtConfig.secret }
            aud = this.jwtAudience.auth
        }

        const jti: UUID = randomUUID() // Genera JTI univoco per il token
        const expiresAt = Math.floor(Date.now() / 1000) + (jwtConfig.expiresInMs / 1000)

        // 🔹 Generazione del Token
        const token: string = await this.jwtService.signAsync(
            {
                iss: this.jwtIssuer,
                aud,
                sub: userId,
                jti,
                sid: sessionId,
                typ: type,
                iat: Math.floor(Date.now() / 1000),
                exp: expiresAt,
                scp
            },
            signOptions
        )

        // 🔹 Se è un AccessToken, memorizziamo il JTI tra i token emessi
        if (type === TokenType.AccessToken || type === TokenType.ws_AccessToken || type === TokenType.PreAuthorizationToken) {
            if (sessionId == undefined) throw new RpcException('NoSuchSessionInAccessTokenSignature')
            const issuedKey = `issued:${sessionId.toString()}:${jti}`
            await this.redisservice.set(issuedKey, '1', jwtConfig.expiresInMs / 1000) // TTL uguale alla durata del token
        } else {
            const issuedKey = `issued:${this.configService.get<UUID>('Session.sessionZeroId')?.toString()}:${jti}`
            await this.redisservice.set(issuedKey, '1', jwtConfig.expiresInMs / 1000) // TTL uguale alla durata del token
        }
        // session 0 = sessione fittizia, per revocare token stateless
        return token
    }


    public async verifyTokenAndGetPayload(
        token: string,
        type: TokenType,
        ignoreExpiration: boolean = false,
        skipRevocationCheck: boolean = false
    ): Promise<AppJwtPayload> | never {

        const jwtConfig = this.getJwtConfigurationFromTokenType(type)

        try {

            let verifyOptions: JwtVerifyOptions

            if (type === TokenType.AccessToken) {
                verifyOptions = {
                    algorithms: ['RS256'],
                    publicKey: this.publicKey,
                    issuer: this.jwtIssuer,
                    audience: this.jwtAudience.access,
                    clockTolerance: 60,
                    ignoreExpiration
                }
            } else if (type === TokenType.ws_AccessToken) {
                verifyOptions = {
                    algorithms: ['RS256'],
                    publicKey: this.ws_publicKey,
                    issuer: this.jwtIssuer,
                    audience: this.jwtAudience.ws,
                    clockTolerance: 60,
                    ignoreExpiration
                }
            } else {
                verifyOptions = {
                    algorithms: ['HS512'],
                    secret: jwtConfig.secret,
                    issuer: this.jwtIssuer,
                    audience: this.jwtAudience.auth,
                    clockTolerance: 60,
                    ignoreExpiration
                }
            }

            await this.jwtService.verifyAsync(token, verifyOptions)
            const payload: AppJwtPayload = this.jwtService.decode<AppJwtPayload>(token)
            if (payload.typ !== type) {
                throw new RpcException(`InvalidToken::Type mismatch`)
            }
            if (!skipRevocationCheck && await this.sessionService.isTokenRevoked(payload.jti)) {
                throw new RpcException(`Revoked${type}`)
            }
            return payload
        } catch (e) {
            this.logger.warn(' > verifyTokenAndGetPayload > Error: ', (e.message ?? e) as string | object)
            throw new RpcException(`InvalidOrExpired${type}`)
        }
    }

    public decodeUnsafe(token: string): AppJwtPayload {
        return this.jwtService.decode(token)
    }

    public extractAccessTokenFromReq(req: FastifyRequest): string {
        const authorizationHeader = String(req.headers['authorization'] ?? '')
        const m = authorizationHeader.match(/^Bearer\s+([A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+)$/i)
        if (!m) {
            throw new RpcException('NoProvidedAccessToken')
        }
        return m[1]
    }

}
