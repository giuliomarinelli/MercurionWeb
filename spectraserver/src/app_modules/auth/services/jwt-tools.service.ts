import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RevokedTokenService } from './revoked-token.service';
import { JwtConfiguration } from 'src/config/@types-config';
import { ConfigService } from '@nestjs/config';
import { TokenType } from '../Models/enums/token-type.enum';

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
        private readonly configService: ConfigService
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

}
