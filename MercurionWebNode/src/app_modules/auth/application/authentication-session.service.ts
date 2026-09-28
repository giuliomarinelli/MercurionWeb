import { Injectable } from '@nestjs/common'
import { createHash, UUID } from 'crypto'
import type { FingerprintData } from '@mercurion/rest-contracts'

import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

import { TokenType } from '../models/enums/token-type.enum'
import { TokenPair } from '../models/interfaces/token-pair.interface'
import { GeoIpService, GeoLocation } from '../services/geo-ip.service'
import { JwtToolsService } from '../services/jwt-tools.service'
import { MfaChallengeService } from '../services/mfa-challenge.service'
import { SessionService } from '../services/session.service'
import { RedisService } from 'src/app_modules/redis/services/redis.service'
import { redisDurations, redisKeys } from 'src/app_modules/redis/contracts/redis-contracts'

@Injectable()
export class AuthenticationSessionService {
    constructor(
        private readonly sessionService: SessionService,
        private readonly mfaService: MfaChallengeService,
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
        const lifetime = Math.max(1, Math.ceil(payload.exp - Date.now() / 1000 + 60))
        await this.redisService.set(
            redisKeys.mfa.preAuthorizationDevice(payload.jti),
            deviceId,
            redisDurations.seconds(lifetime)
        )
        await this.redisService.eval(
            `
                local previous = redis.call('GET', KEYS[1])
                if previous then
                    local ttl = redis.call('TTL', ARGV[2] .. previous)
                    if ttl < 1 then ttl = tonumber(ARGV[6])
                    else ttl = ttl + tonumber(ARGV[6]) end
                    redis.call('SET', ARGV[3] .. previous, '1', 'EX', ttl)
                    redis.call('DEL', ARGV[5] .. previous)
                end
                redis.call('SET', KEYS[1], ARGV[1], 'EX', ARGV[4])
                return previous
            `,
            [redisKeys.mfa.activePreAuthorization(userId)],
            [
                payload.jti,
                redisKeys.token.issuedByJti(''),
                redisKeys.token.revoked(''),
                String(lifetime),
                redisKeys.mfa.preAuthorizationDevice(''),
                '60'
            ]
        )
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
