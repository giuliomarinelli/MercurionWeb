import { Injectable } from '@nestjs/common'
import { createHash, UUID } from 'crypto'
import type { FingerprintData } from '@mercurion/rest-contracts'

import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

import { TokenType } from '../Models/enums/token-type.enum'
import { TokenPair } from '../Models/interfaces/token-pair.interface'
import { GeoIpService, GeoLocation } from '../services/geo-ip.service'
import { JwtToolsService } from '../services/jwt-tools.service'
import { MfaService } from '../services/mfa.service'
import { SessionService } from '../services/session.service'
import { RedisService } from 'src/app_modules/redis/services/redis.service'

@Injectable()
export class AuthenticationSessionService {
    constructor(
        private readonly sessionService: SessionService,
        private readonly mfaService: MfaService,
        private readonly jwtTools: JwtToolsService,
        private readonly geoIpService: GeoIpService,
        private readonly redisService: RedisService
    ) { }

    public generateFingerprint(fingerprintData: FingerprintData): string {
        return createHash('sha256')
            .update(JSON.stringify(fingerprintData).toLocaleLowerCase())
            .digest('hex')
    }

    public async createMfaPreAuthorizationToken(
        userId: UUID,
        sessionId: UUID,
        deviceId: UUID
    ): Promise<string> {
        const token = await this.jwtTools.generateToken(
            userId,
            TokenType.PreAuthorizationToken,
            sessionId
        )
        const payload = this.jwtTools.decodeUnsafe(token)
        await this.redisService.set(`mfa:pat:dev:${payload.jti}`, deviceId, 300)
        return token
    }

    public async completeAuthenticatedSession(
        userId: UUID,
        sessionId: UUID,
        fingerprintData: FingerprintData,
        ip: string,
        trustVerify: boolean = false
    ): Promise<TokenPair> {
        const session = await this.sessionService.getSession(sessionId, userId)
        if (!session) {
            throw applicationError(ApplicationErrorCode.SESSION_INVALID)
        }

        if (await this.mfaService.isMfaEnabled(userId) || trustVerify) {
            await this.sessionService.activateSession(sessionId, userId)
            await this.sessionService.setDeviceIdAsKnown(session.deviceId, userId)
        }

        const fingerprint = this.generateFingerprint(fingerprintData)
        await this.sessionService.addFingerprintToWhiteList(userId, fingerprint)

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { city, country, ip: _ip, region, ...geoLocation } =
            this.geoIpService.getLocation(ip)
        await this.sessionService.addTrustedLocation(userId, geoLocation as GeoLocation)

        return {
            accessToken: await this.jwtTools.generateToken(
                userId,
                TokenType.AccessToken,
                sessionId
            ),
            ws_accessToken: await this.jwtTools.generateToken(
                userId,
                TokenType.ws_AccessToken,
                sessionId
            )
        }
    }
}
