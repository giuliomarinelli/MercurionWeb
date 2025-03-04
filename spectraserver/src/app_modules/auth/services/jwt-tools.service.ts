import { Injectable } from '@nestjs/common';
import { JwtService, JwtSignOptions, JwtVerifyOptions } from '@nestjs/jwt';
import { RevokedTokenService } from './revoked-token.service';
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
import { join } from 'path';
import { RedisService } from 'src/app_modules/redis/services/redis.service';

@Injectable()
export class JwtToolsService {

    private readonly accessTokenConfig: JwtConfiguration = { expiresInMs: 0 }
    private readonly preAuthorizationTokenConfig: JwtConfiguration
    private readonly activationTokenConfig: JwtConfiguration
    private readonly phoneNumberVerificationTokenConfig: JwtConfiguration
    private readonly emailVerificationTokenConfig: JwtConfiguration
    private readonly jwtIssuer: string
    private readonly defaultJwtConfig: JwtConfiguration = {
        secret: '',
        expiresInMs: 0
    }

    private readonly privateKey: string
    private readonly publicKey: string

    constructor(
        private readonly jwtService: JwtService,
        private readonly revokedTokenService: RevokedTokenService,
        private readonly configService: ConfigService,
        private readonly userService: UserService,
        private readonly redisservice: RedisService
    ) {
        this.accessTokenConfig.expiresInMs = this.configService.get<number>("Jwt.accessToken.expiresInMs") ?? 0
        this.preAuthorizationTokenConfig = this.configService
            .get<JwtConfiguration>("Jwt.preAuthorizationToken") ?? { ...this.defaultJwtConfig }
        this.activationTokenConfig = this.configService
            .get<JwtConfiguration>("Jwt.activationToken") ?? { ...this.defaultJwtConfig }
        this.phoneNumberVerificationTokenConfig = this.configService
            .get<JwtConfiguration>("Jwt.phoneNumberVerificationToken") ?? { ...this.defaultJwtConfig }
        this.emailVerificationTokenConfig = this.configService
            .get<JwtConfiguration>("Jwt.emailVerificationToken") ?? { ...this.defaultJwtConfig }
        this.jwtIssuer = this.configService.get<string>("Jwt.issuer") ?? ''

        this.privateKey = join(__dirname, readFileSync('src/config/keys/private.pem', 'utf8'))
        this.publicKey = join(__dirname, readFileSync('src/config/keys/public.pem', 'utf8'))

    }

    private getJwtConfigurationFromTokenType(type: TokenType): JwtConfiguration {
        switch (type) {
            case TokenType.AccessToken: return this.accessTokenConfig
            case TokenType.PreAuthorizationToken: return this.preAuthorizationTokenConfig
            case TokenType.ActivationToken: return this.activationTokenConfig
            case TokenType.PhoneNumberVerificationToken: return this.phoneNumberVerificationTokenConfig
            case TokenType.EmailVerificationToken: return this.emailVerificationTokenConfig
        }
    }

    public async generateToken(userId: UUID, sessionId: UUID, type: TokenType): Promise<string> {
        const jwtConfig = this.getJwtConfigurationFromTokenType(type)
        const scopes: string[] = await this.userService.getUserScopesById(userId) ?? []
        const scp: string = scopes.map(s => GeneralUtils.getEnumKeyByValue(Scope, s)).join(' ')
    
        // 🔹 Usa RS256 per AccessToken, HS512 per gli altri
        const signOptions: JwtSignOptions = type === TokenType.AccessToken
            ? { algorithm: "RS256", privateKey: this.privateKey }
            : { algorithm: "HS512", secret: jwtConfig.secret }
    
        const jti: UUID = randomUUID(); // Genera JTI univoco per il token
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
        );
    
        // 🔹 Se è un AccessToken, memorizziamo il JTI tra i token emessi
        if (type === TokenType.AccessToken) {
            const issuedKey = `issued:${sessionId.toString()}:${jti}`
            await this.redisservice.set(issuedKey, '1', jwtConfig.expiresInMs / 1000) // TTL uguale alla durata del token
        }
    
        return token
    }
    

    public async verifyTokenAndGetPayload(token: string, type: TokenType, ignoreExpiration: boolean = false): Promise<AppJwtPayload> {

        const jwtConfig = this.getJwtConfigurationFromTokenType(type)

        try {
            const verifyOptions: JwtVerifyOptions = type === TokenType.AccessToken
                ? { algorithms: ["RS256"], publicKey: this.publicKey, ignoreExpiration }
                : { algorithms: ["HS512"], secret: jwtConfig.secret, ignoreExpiration }

            await this.jwtService.verifyAsync(token, verifyOptions)
            const payload: AppJwtPayload = this.jwtService.decode<AppJwtPayload>(token)

            if (await this.revokedTokenService.isTokenRevoked(payload.jti)) {
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
