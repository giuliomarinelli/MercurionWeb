import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { UUID } from 'crypto'
import type {
    FingerprintData,
    MfaStrategy as WireMfaStrategy,
    SessionDeviceInfo
} from '@mercurion/rest-contracts'

import { RedisService } from 'src/app_modules/redis/services/redis.service'
import { AuthProvider } from 'src/app_modules/sso/Models/enums/auth-provider.enum'
import { UserService } from 'src/app_modules/user/services/user.service'
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'
import { GeneralUtils } from 'src/utils/general-utils/general-utils'
import { Environment } from 'src/config/config.schema'
import type { AppConfiguration } from 'src/config/config.types'
import { redisDurations, redisKeys } from 'src/app_modules/redis/contracts/redis-contracts'

import { CompareResult } from '../Models/enums/compare-result.enum'
import { GeoIpService, GeoLocation } from '../services/geo-ip.service'
import { MfaService } from '../services/mfa.service'
import { PasswordEncoderService } from '../services/password-encoder.service'
import { SercurityService } from '../services/sercurity.service'
import { SessionService } from '../services/session.service'
import { AuthenticationSessionService } from './authentication-session.service'

export interface VerifyEmailCommand {
    email: string
}

export type VerifyEmailResult =
    | { verified: true }
    | { verified: false }

@Injectable()
export class VerifyEmailHandler {
    constructor(private readonly userService: UserService) { }

    public async execute(command: VerifyEmailCommand): Promise<VerifyEmailResult> {
        return {
            verified: await this.userService.existsUserByEmail(command.email)
        }
    }
}

export interface CredentialLoginCommand {
    email: string
    password: string
    remember: boolean
    ip: string
    deviceId: UUID
    sessionDeviceInfo: SessionDeviceInfo
    fingerprintData: FingerprintData
}

interface CredentialLoginResultBase {
    sessionId: UUID
    remember: boolean
    needsMfa: boolean
    enabledMfaStrategies: WireMfaStrategy[]
    obscuredEmail?: string
    obscuredPhoneNumber?: string
    suspiciousAttempt: boolean
    initials: string
    signedDeviceId: string
}

export type CredentialLoginResult =
    | CredentialLoginResultBase & {
        next: 'mfa'
        preAuthorizationToken: string
    }
    | CredentialLoginResultBase & {
        next: 'authenticated'
        accessToken: string
        ws_accessToken: string
    }

@Injectable()
export class CredentialLoginHandler {
    constructor(
        private readonly passwordEncoder: PasswordEncoderService,
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly securityService: SercurityService,
        private readonly mfaService: MfaService,
        private readonly geoIpService: GeoIpService,
        private readonly redisService: RedisService,
        private readonly authenticationSession: AuthenticationSessionService,
        private readonly configService: ConfigService
    ) { }

    public async execute(command: CredentialLoginCommand): Promise<CredentialLoginResult> {
        const {
            email,
            password,
            remember,
            ip,
            deviceId,
            sessionDeviceInfo,
            fingerprintData
        } = command
        const appConfiguration =
            this.configService.getOrThrow<AppConfiguration>('App')
        const isLocalTestAccount =
            appConfiguration.env === Environment.Development &&
            !!appConfiguration.localTestAccountEmail?.trim() &&
            GeneralUtils.normalizeEmail(email) ===
            GeneralUtils.normalizeEmail(appConfiguration.localTestAccountEmail)
        const lockKey = redisKeys.authentication.loginLock(email)
        const failKey = redisKeys.authentication.loginFailures(email)

        if (await this.redisService.exists(lockKey)) {
            throw applicationError(ApplicationErrorCode.AUTHENTICATION_TOO_MANY_ATTEMPTS)
        }

        const auth = await this.userService.getVerifiedUserAuthByEmail(email)
        if (!auth || !auth.userId || !auth.passwordHash || auth.locked) {
            await this.bumpLoginFailCounter(failKey, lockKey)
            throw applicationError(ApplicationErrorCode.AUTHENTICATION_INVALID_CREDENTIALS)
        }

        const comparison = await this.passwordEncoder.compareWithFallback(
            password,
            auth.passwordHash,
            true
        )
        if (comparison === CompareResult.NoMatch) {
            await this.bumpLoginFailCounter(failKey, lockKey)
            throw applicationError(ApplicationErrorCode.AUTHENTICATION_INVALID_CREDENTIALS)
        }

        try {
            if (
                comparison === CompareResult.MatchLegacy ||
                await this.passwordEncoder.needsRehash(auth.passwordHash)
            ) {
                const newHash = await this.passwordEncoder.encode(password)
                await this.userService.migratePasswordHash(
                    auth.userId,
                    auth.passwordHash,
                    newHash
                )
            }
        } catch {
            // Opportunistic password-hash upgrades never block authentication.
        }

        const unknownDeviceId =
            !await this.sessionService.isKnownDeviceId(deviceId, auth.userId)
        const fingerprint =
            this.authenticationSession.generateFingerprint(fingerprintData)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { city, country, ip: _ip, region, ...geoLocation } =
            this.geoIpService.getLocation(ip)
        const location = [city, region, country]
            .filter(value => value != null)
            .join(', ')
        const trustedLocations =
            await this.sessionService.getTrustedLocations(auth.userId)
        const trustedCurrentLocation = this.geoIpService.isTrustedLocation(
            geoLocation as GeoLocation,
            trustedLocations
        )
        const session = await this.sessionService.createSession({
            deviceId,
            userId: auth.userId,
            IP: ip,
            sessionDeviceInfo,
            fingerprint,
            location,
            provider: AuthProvider.Mercurion
        }, remember)
        const inWhiteList =
            await this.sessionService.isFingerprintInWhiteList(auth.userId, fingerprint)
        const configuredStrategies: MfaStrategy[] = isLocalTestAccount
            ? []
            : await this.mfaService.getEnabledMfaStrategies(auth.userId)
        let needsMfa = configuredStrategies.length > 0
        const isMfaEnabledBySettings = needsMfa

        if (
            !isLocalTestAccount &&
            (!inWhiteList || !trustedCurrentLocation || unknownDeviceId) &&
            !needsMfa
        ) {
            needsMfa = true
        }
        if (!needsMfa) {
            await this.sessionService.activateSession(session.sessionId, auth.userId)
        }

        const phone = await this.userService.getPhoneNumberById(auth.userId)
        let obscuredEmail = configuredStrategies.includes(MfaStrategy.EMAIL_OTP)
            ? this.securityService.maskEmail(email)
            : undefined
        const obscuredPhoneNumber =
            phone && configuredStrategies.includes(MfaStrategy.SMS_OTP)
                ? this.securityService.maskEmail(phone)
                : undefined
        let enabledMfaStrategies: WireMfaStrategy[] = configuredStrategies
            .map(value => GeneralUtils.getEnumKeyByValue(MfaStrategy, value))
            .filter(value => value !== undefined)
        let suspiciousAttempt = false

        if (
            !isLocalTestAccount &&
            (!inWhiteList || !trustedCurrentLocation || unknownDeviceId) &&
            !isMfaEnabledBySettings
        ) {
            enabledMfaStrategies = ['EMAIL_OTP']
            suspiciousAttempt = true
            obscuredEmail = this.securityService.maskEmail(email)
        }

        await this.redisService.del(failKey)
        await this.redisService.del(lockKey)

        const common: CredentialLoginResultBase = {
            sessionId: session.sessionId,
            remember,
            needsMfa,
            enabledMfaStrategies,
            obscuredEmail,
            obscuredPhoneNumber,
            suspiciousAttempt,
            initials: await this.userService.getUserInitialsByUserId(auth.userId) ?? '',
            signedDeviceId: this.securityService.signDeviceId(deviceId)
        }

        if (needsMfa || suspiciousAttempt) {
            return {
                ...common,
                next: 'mfa',
                preAuthorizationToken:
                    await this.authenticationSession.createMfaPreAuthorizationToken(
                        auth.userId,
                        session.sessionId,
                        deviceId
                    )
            }
        }

        return {
            ...common,
            next: 'authenticated',
            ...await this.authenticationSession.completeAuthenticatedSession(
                auth.userId,
                session.sessionId,
                fingerprintData,
                ip
            )
        }
    }

    private async bumpLoginFailCounter(
        failKey: ReturnType<typeof redisKeys.authentication.loginFailures>,
        lockKey: ReturnType<typeof redisKeys.authentication.loginLock>
    ): Promise<void> {
        const fails = await this.redisService.incr(failKey)
        if (fails === 1) {
            await this.redisService.setTTL(failKey, redisDurations.minutes(15))
        }

        if (fails >= 8) {
            await this.redisService.set(lockKey, '1', redisDurations.minutes(5))
            await this.redisService.del(failKey)
        }
    }
}
