import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { JwtConfiguration } from 'src/config/@types-config';
import { ConfigService } from '@nestjs/config';
import { TokenType } from '../Models/enums/token-type.enum';
import { randomUUID, UUID } from 'crypto';
import { UserService } from 'src/app_modules/user/services/user.service';
import { GeneralUtils } from 'src/general-utils/general-utils';
import { Scope } from 'src/app_modules/user/Models/enums/scope.enum';
import { FastifyRequest } from 'fastify';
import { RpcException } from '@nestjs/microservices';
import { AppJwtPayload } from '../Models/interfaces/app-jwt-payload.interface';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { SessionService } from './session.service';

@Injectable()
export class JwtToolsService {

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

    private readonly jwtIssuer: string

    private readonly privateKey: string
    private readonly publicKey: string
    private readonly ws_privateKey: string
    private readonly ws_publicKey: string

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        private readonly redisservice: RedisService,
        private readonly sessionService: SessionService
    ) {
        this.accessTokenConfig.expiresInMs = this.configService.get<number>("Jwt.accessToken.expiresInMs") as number
        this.ws_accessTokenConfig.expiresInMs = this.configService.get<number>("Jwt.ws_accessToken.expiresInMs") as number
        this.preAuthorizationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.preAuthorizationToken") as JwtConfiguration
        this.activationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.activationToken") as JwtConfiguration
        this.phoneNumberVerificationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.phoneNumberVerificationToken") as JwtConfiguration
        this.emailVerificationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.emailVerificationToken") as JwtConfiguration
        this.emailOtpMfaActivationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.emailOtpMfaActivationToken") as JwtConfiguration
        this.smsOtpMfaActivationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.smsOtpMfaActivationToken") as JwtConfiguration
        this.appTotpMfaActivationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.appTotpMfaActivationToken") as JwtConfiguration
        this.emailOtpMfaInactivationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.emailOtpMfaInactivationToken") as JwtConfiguration
        this.smsOtpMfaInactivationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.smsOtpMfaInactivationToken") as JwtConfiguration
        this.appTotpMfaInactivationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.appTotpMfaInactivationToken") as JwtConfiguration

        this.jwtIssuer = this.configService.get<string>("Jwt.issuer") as string

        this.privateKey = readFileSync(resolve(__dirname, '../../../config/keys/private.pem'), 'utf8')
        this.publicKey = readFileSync(resolve(__dirname, '../../../config/keys/public.pem'), 'utf8')
        this.ws_privateKey = readFileSync(resolve(__dirname, '../../../config/keys/ws_private.pem'), 'utf8')
        this.ws_publicKey = readFileSync(resolve(__dirname, '../../../config/keys/ws_public.pem'), 'utf8')

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
        }
    }

    public async generateToken(userId: UUID, type: TokenType, sessionId?: UUID): Promise<string> {
        const jwtConfig = this.getJwtConfigurationFromTokenType(type)
        const scopes: string[] = await this.userService.getUserScopesById(userId) ?? []
        const scp: string = scopes.map(s => GeneralUtils.getEnumKeyByValue(Scope, s)).join(' ')

        // 🔹 Usa RS256 per gli AccessToken, HS512 per gli altri
        let signOptions: JwtSignOptions
        if (type === TokenType.AccessToken) {
            signOptions = { algorithm: "RS256", privateKey: this.privateKey }
        } else if (type === TokenType.ws_AccessToken) {
            signOptions = { algorithm: "RS256", privateKey: this.ws_privateKey }
        } else {
            signOptions = { algorithm: "HS512", secret: jwtConfig.secret }
        }

        const jti: UUID = randomUUID() // Genera JTI univoco per il token
        const expiresAt = Math.floor(Date.now() / 1000) + (jwtConfig.expiresInMs / 1000)

        // 🔹 Generazione del Token
        const token: string = await this.jwtService.signAsync(
            {
                iss: this.jwtIssuer,
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


    public async verifyTokenAndGetPayload(token: string, type: TokenType, ignoreExpiration: boolean = false): Promise<AppJwtPayload> | never {

        const jwtConfig = this.getJwtConfigurationFromTokenType(type)

        try {

            let verifyOptions: JwtVerifyOptions

            if (type === TokenType.AccessToken) {
                verifyOptions = { algorithms: ["RS256"], publicKey: this.publicKey, ignoreExpiration }
            } else if (type === TokenType.ws_AccessToken) {
                verifyOptions = { algorithms: ["RS256"], publicKey: this.ws_publicKey, ignoreExpiration }
            } else {
                verifyOptions = { algorithms: ["HS512"], secret: jwtConfig.secret, ignoreExpiration }
            }

            await this.jwtService.verifyAsync(token, verifyOptions)
            const payload: AppJwtPayload = this.jwtService.decode<AppJwtPayload>(token)

            if (await this.sessionService.isTokenRevoked(payload.jti)) {
                throw new RpcException(`Revoked${type}`)
            }
            return payload
        } catch {
            throw new RpcException(`InvalidOrExpired${type}`)
        }
    }

    public extractAccessTokenFromReq(req: FastifyRequest): string | never {
        
        const authorizationHeader: string = req.headers['authorization'] ?? ''

        if (
            !authorizationHeader ||
            !authorizationHeader.trim() ||
            !new RegExp(/^Bearer\s[\w-]+(?:\.[\w-]+){2}$/).test(authorizationHeader)
        ) {
            throw new RpcException('NoProvidedAccessToken')
        }

        return authorizationHeader.split(/\s/)[1]
    }
}
