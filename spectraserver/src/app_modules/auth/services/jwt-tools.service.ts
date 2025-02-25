import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RevokedTokenService } from './revoked-token.service';
import { JwtConfiguration } from 'src/config/@types-config';
import { ConfigService } from '@nestjs/config';
import { TokenType } from '../Models/enums/token-type.enum';
import { randomUUID, UUID } from 'crypto';
import { UserService } from 'src/app_modules/user/services/user.service';
import { GeneralUtils } from 'src/general-utils/general-utils';
import { Scope } from 'src/app_modules/user/Models/enums/scope.enum';

@Injectable()
export class JwtToolsService {

    private readonly accessTokenConfig: JwtConfiguration
    private readonly refreshTokenConfig: JwtConfiguration
    private readonly preAuthorizationTokenConfig: JwtConfiguration
    private readonly activationTokenConfig: JwtConfiguration
    private readonly phoneNumberVerificationTokenConfig: JwtConfiguration
    private readonly emailVerificationTokenConfig: JwtConfiguration
    private readonly jwtIssuer: string
    private readonly defaultJwtConfig: JwtConfiguration = {
        secret: '',
        expiresInMs: 0
    }

    constructor(
        private readonly jwtService: JwtService,
        private readonly revokedTokenService: RevokedTokenService,
        private readonly configService: ConfigService,
        private readonly userService: UserService
    ) {
        this.accessTokenConfig = this.configService.get<JwtConfiguration>("Jwt.accessToken") ?? { ...this.defaultJwtConfig }
        this.refreshTokenConfig = this.configService.get<JwtConfiguration>("Jwt.refreshToken") ?? { ...this.defaultJwtConfig }
        this.preAuthorizationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.preAuthorizationToken") ?? { ...this.defaultJwtConfig }
        this.activationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.activationToken") ?? { ...this.defaultJwtConfig }
        this.phoneNumberVerificationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.phoneNumberVerificationToken") ?? { ...this.defaultJwtConfig }
        this.emailVerificationTokenConfig = this.configService.get<JwtConfiguration>("Jwt.emailVerificationToken") ?? { ...this.defaultJwtConfig }
        this.jwtIssuer = this.configService.get<string>("Jwt.issuer") ?? ''
    }

    private getJwtConfigurationFromTokenType(type: TokenType): JwtConfiguration {

        let jwtConfig: JwtConfiguration

        switch (type) {

            case TokenType.AccessToken:
                jwtConfig = this.accessTokenConfig
                break
            case TokenType.PreAuthorizationToken:
                jwtConfig = this.preAuthorizationTokenConfig
                break
            case TokenType.ActivationToken:
                jwtConfig = this.activationTokenConfig
                break
            case TokenType.PhoneNumberVerificationToken:
                jwtConfig = this.phoneNumberVerificationTokenConfig
                break
            case TokenType.EmailVerificationToken:
                jwtConfig = this.emailVerificationTokenConfig

        }

        return jwtConfig

    }

    public async generateToken(userId: UUID, sessionId: UUID, type: TokenType): Promise<string> {

        const jwtConfig = this.getJwtConfigurationFromTokenType(type)

        const scopes: string[] = await this.userService.getUserScopesById(userId) ?? []

        const scp: string = scopes.map(s => GeneralUtils.getEnumKeyByValue(Scope, s as any)).join(' ')

        return await this.jwtService.signAsync(
            {
                iss: this.jwtIssuer,
                sub: userId,
                jti: randomUUID(),
                sid: sessionId,
                typ: type,
                iat: Date.now(),
                exp: Date.now() + jwtConfig.expiresInMs,
                scp
            },
            {
                algorithm: "HS512",
                secret: jwtConfig.secret
            }
        )

    }

}
