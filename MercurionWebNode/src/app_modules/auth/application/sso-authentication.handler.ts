import { Injectable } from '@nestjs/common'
import { UUID } from 'crypto'
import type { FingerprintData, SessionDeviceInfo } from '@mercurion/rest-contracts'

import { AuthProvider } from 'src/app_modules/sso/Models/enums/auth-provider.enum'
import { UserService } from 'src/app_modules/user/services/user.service'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { TypeGuards } from 'src/utils/type-guards/type-guards'

import { TokenType } from '../Models/enums/token-type.enum'
import { GeoIpService } from '../services/geo-ip.service'
import { JwtToolsService } from '../services/jwt-tools.service'
import { SercurityService } from '../services/sercurity.service'
import { SessionService } from '../services/session.service'
import { AuthenticationSessionService } from './authentication-session.service'

export interface CompleteSsoAuthenticationCommand {
    ssoPreAuthorizationToken: string
    ip: string
    deviceId: UUID
    sessionDeviceInfo: SessionDeviceInfo
    fingerprintData: FingerprintData
    provider: string
}

export type CompleteSsoAuthenticationResult =
    | {
        outcome: 'authenticated'
        provider: AuthProvider
        sessionId: UUID
        accessToken: string
        ws_accessToken: string
        initials: string
        signedDeviceId: string
    }
    | { outcome: 'invalid-provider' }
    | { outcome: 'unauthorized' }

@Injectable()
export class CompleteSsoAuthenticationHandler {
    constructor(
        private readonly jwtTools: JwtToolsService,
        private readonly sessionService: SessionService,
        private readonly userService: UserService,
        private readonly geoIpService: GeoIpService,
        private readonly securityService: SercurityService,
        private readonly authenticationSession: AuthenticationSessionService
    ) { }

    public async execute(
        command: CompleteSsoAuthenticationCommand
    ): Promise<CompleteSsoAuthenticationResult> {
        if (
            !TypeGuards.isAuthProvider(command.provider) ||
            command.provider === AuthProvider.Mercurion
        ) {
            return { outcome: 'invalid-provider' }
        }

        try {
            const { sub: userId } = await this.jwtTools.verifyTokenAndGetPayload(
                command.ssoPreAuthorizationToken,
                TokenType.SSO_PreAuthorizationToken
            )
            const { sub: verifiedUserId, jti } =
                await this.jwtTools.verifyTokenAndGetPayload(
                    command.ssoPreAuthorizationToken,
                    TokenType.SSO_PreAuthorizationToken
                )
            await this.sessionService.revokeToken(jti)
            if (!await this.userService.existsUserById(verifiedUserId)) {
                throw applicationError(
                    ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED
                )
            }

            const { city, region, country } =
                this.geoIpService.getLocation(command.ip)
            const session = await this.sessionService.createSession({
                deviceId: command.deviceId,
                IP: command.ip,
                fingerprint: this.authenticationSession.generateFingerprint(
                    command.fingerprintData
                ),
                location: [city, region, country].filter(value => !!value).join(', '),
                provider: command.provider,
                userId: verifiedUserId,
                sessionDeviceInfo: command.sessionDeviceInfo
            }, true)
            await this.sessionService.activateSession(
                session.sessionId,
                verifiedUserId
            )

            return {
                outcome: 'authenticated',
                provider: command.provider,
                sessionId: session.sessionId,
                accessToken: await this.jwtTools.generateToken(
                    verifiedUserId,
                    TokenType.AccessToken,
                    session.sessionId
                ),
                ws_accessToken: await this.jwtTools.generateToken(
                    verifiedUserId,
                    TokenType.ws_AccessToken,
                    session.sessionId
                ),
                initials:
                    await this.userService.getUserInitialsByUserId(userId) ?? '',
                signedDeviceId:
                    this.securityService.signDeviceId(command.deviceId)
            }
        } catch {
            return { outcome: 'unauthorized' }
        }
    }
}
