import { Authentication } from './../Models/interfaces/authentication.interface';
import { UserService } from 'src/app_modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import { PasswordEncoderService } from './password-encoder.service';

import { SessionService } from './session.service';
import type { FingerprintData, SessionDeviceInfo } from '@mercurion/rest-contracts'
import { MfaService } from './mfa.service';
import { JwtToolsService } from './jwt-tools.service';
import { TokenType } from '../Models/enums/token-type.enum';
import { ResponseService } from 'src/services/response.service';
import { SercurityService } from './sercurity.service';
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';
import { nullish } from 'src/Models/nullish.type';
import { IAuth } from '../Models/interfaces/i-auth.interface';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { createHash, UUID } from 'crypto';
import { GeoIpService, GeoLocation } from './geo-ip.service';
import { TokenPair } from '../Models/interfaces/token-pair.interface';
import { CompareResult } from '../Models/enums/compare-result.enum';
import { RedisService } from 'src/app_modules/redis/services/redis.service';
import { AuthProvider } from 'src/app_modules/sso/Models/enums/auth-provider.enum';
import type { MfaStrategy as WireMfaStrategy } from '@mercurion/rest-contracts'
import { ApplicationErrorCode, applicationError } from 'src/exception-handling/application-error'

@Injectable()
export class AuthenticationService {

    constructor(
        private readonly passwordEncoder: PasswordEncoderService,
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly securityService: SercurityService,
        private readonly mfaService: MfaService,
        private readonly jwtTools: JwtToolsService,
        private readonly _r: ResponseService,
        private readonly geoIpService: GeoIpService,
        private readonly redisService: RedisService
    ) { }

    private getFailKey(email: string): string {
        return `auth:fails:${email.toLowerCase()}`
    }

    private getLockKey(email: string): string {
        return `auth:lock:${email.toLowerCase()}`
    }

    private async bumpLoginFailCounter(failKey: string, lockKey: string): Promise<void> {
        const fails = await this.redisService.getClient().incr(failKey)
        if (fails === 1) {
            await this.redisService.setTTL(failKey, 15 * 60) // 15 min
        }

        const MAX_FAILS = 8
        if (fails >= MAX_FAILS) {
            await this.redisService.set(lockKey, '1', 5 * 60) // lock 10 min
            await this.redisService.del(failKey)
        }
    }

    private generateFingerprint(fingerprintData: FingerprintData): string {
        return createHash('sha256').update(JSON.stringify(fingerprintData).toLocaleLowerCase()).digest('hex')
    }

    // Restituisce un oggetto Authentication necessario per generare un token JWT
    public async emailAndPasswordAuthentication(
        email: string,
        password: string,
        remember: boolean,
        IP: string,
        deviceId: string,
        sessionDeviceInfo: SessionDeviceInfo,
        fingerprintData: FingerprintData
    ): Promise<Authentication> {

        const lockKey = this.getLockKey(email)
        const failKey = this.getFailKey(email)

        const isLocked = await this.redisService.exists(this.getLockKey(email))
        if (isLocked) {
            throw applicationError(ApplicationErrorCode.AUTHENTICATION_TOO_MANY_ATTEMPTS);
        }

        const auth: IAuth | nullish = await this.userService.getVerifiedUserAuthByEmail(email)
        if (!auth || !auth.userId || !auth.passwordHash || auth.locked) {
            await this.bumpLoginFailCounter(failKey, lockKey)
            throw applicationError(ApplicationErrorCode.AUTHENTICATION_INVALID_CREDENTIALS)
        }

        const cmp = await this.passwordEncoder.compareWithFallback(password, auth.passwordHash, true)
        if (cmp === CompareResult.NoMatch) {
            await this.bumpLoginFailCounter(failKey, lockKey)
            throw applicationError(ApplicationErrorCode.AUTHENTICATION_INVALID_CREDENTIALS)
        }

        // Opportunistic upgrade (non-blocking)
        try {
            if (
                cmp === CompareResult.MatchLegacy ||
                (await this.passwordEncoder.needsRehash(auth.passwordHash))
            ) {
                const newHash = await this.passwordEncoder.encode(password)
                await this.userService.migratePasswordHash(auth.userId, auth.passwordHash, newHash)
            }
        } catch {
            // pass
        }
        const unknwonDeviceId = !await this.sessionService.isKnownDeviceId(deviceId, auth.userId)
        const fingerprint = this.generateFingerprint(fingerprintData)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { city, country, ip, region, ...geoLocation } = this.geoIpService.getLocation(IP)
        const locations: (string | null)[] = [city, region, country]
        const location = locations.filter(loc => loc != null).join(', ')
        const alreadyTrustedLocations: GeoLocation[] = await this.sessionService.getTrustedLocations(auth.userId)
        const isTrustedCurrentLocation: boolean = this.geoIpService.isTrustedLocation(geoLocation as GeoLocation, alreadyTrustedLocations)
        const session = await this.sessionService.createSession({ deviceId, userId: auth.userId, IP, sessionDeviceInfo, fingerprint, location, provider: AuthProvider.Mercurion }, remember)
        const sessionId = session.sessionId
        const inWhiteList: boolean = await this.sessionService.isFingerprintInWhiteList(auth.userId, fingerprint)
        const _enabledMfaStrategies: MfaStrategy[] = await this.mfaService.getEnabledMfaStrategies(auth.userId)
        let needsMfa: boolean = !!_enabledMfaStrategies.length
        const isMfaEnabledBySettings: boolean = needsMfa
        if ((!inWhiteList || !isTrustedCurrentLocation || unknwonDeviceId) && !needsMfa) {
            needsMfa = true
        }
        if (!needsMfa) {
            await this.sessionService.activateSession(sessionId, auth.userId)
        }
        const phone: string | nullish = await this.userService.getPhoneNumberById(auth.userId)
        let obscuredEmail = _enabledMfaStrategies.includes(MfaStrategy.EMAIL_OTP) ? this.securityService.maskEmail(email) : undefined
        const obscuredPhoneNumber = phone && _enabledMfaStrategies.includes(MfaStrategy.SMS_OTP) ? this.securityService.maskEmail(phone) : undefined
        let enabledMfaStrategies: WireMfaStrategy[] = _enabledMfaStrategies
            .map(val => GeneralUtils.getEnumKeyByValue(MfaStrategy, val))
            .filter(val => val !== undefined)
        let suspiciousAttempt: boolean = false
        if ((!inWhiteList || !isTrustedCurrentLocation || unknwonDeviceId) && !isMfaEnabledBySettings) {
            enabledMfaStrategies = ['EMAIL_OTP']
            suspiciousAttempt = true
            obscuredEmail = this.securityService.maskEmail(email)
        }
        await this.redisService.del(failKey)
        await this.redisService.del(lockKey)
        return {
            userId: auth.userId,
            sessionId,
            needsMfa,
            enabledMfaStrategies,
            obscuredEmail,
            obscuredPhoneNumber,
            suspiciousAttempt,
            deviceId: deviceId as UUID
        }

    }

    // Restituisce un PreAuthorizationToken da un oggetto Authentication dopo che il primo fattore di autenticazione è andato a buon fine
    public async performPreAuthenticationForMfa(auth: Authentication): Promise<string> {
        const { userId, sessionId, deviceId } = auth
        const token = await this.jwtTools.generateToken(userId, TokenType.PreAuthorizationToken, sessionId)
        const payload = this.jwtTools.decodeUnsafe(token)
        await this.redisService.set(`mfa:pat:dev:${payload.jti}`, deviceId, 300) // 5 min
        return token
    }


    // Restituisce un DTO di risposta con l'Access Token e se l'utente ha MFA attiva, attiva anche la sessione
    public async performAuthentication(auth: Authentication | Omit<Authentication, 'deviceId' | 'needsMfa' | 'enabledMfaStrategies' | 'suspiciousAttempt'>, fingerprintData: FingerprintData, ip: string, trustVerify: boolean = false): Promise<TokenPair> {
        const { userId, sessionId } = auth
        const session = await this.sessionService.getSession(sessionId, userId)
        if (session) {
            if (await this.mfaService.isMfaEnabled(userId) || trustVerify) {
                await this.sessionService.activateSession(sessionId, auth.userId)
                await this.sessionService.setDeviceIdAsKnown(session.deviceId, userId)
            }
            const fingerprint: string = this.generateFingerprint(fingerprintData)
            await this.sessionService.addFingerprintToWhiteList(userId, fingerprint)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { city, country, ip: _ip, region, ...geoLocation } = this.geoIpService.getLocation(ip)
            await this.sessionService.addTrustedLocation(userId, geoLocation as GeoLocation)
            const accessToken = await this.jwtTools.generateToken(userId, TokenType.AccessToken, sessionId)
            const ws_accessToken = await this.jwtTools.generateToken(userId, TokenType.ws_AccessToken, sessionId)
            return {
                accessToken,
                ws_accessToken
            }
        }
        throw applicationError(ApplicationErrorCode.SESSION_INVALID)
    }

    public async perform_SSO_Authentication(
        sso_pat: string,
        IP: string,
        deviceId: string,
        sessionDeviceInfo: SessionDeviceInfo,
        fingerprintData: FingerprintData,
        provider: AuthProvider
    ): Promise<TokenPair & { sessionId: UUID }> {
        const { sub: userId, jti } = await this.jwtTools.verifyTokenAndGetPayload(sso_pat, TokenType.SSO_PreAuthorizationToken)
        await this.sessionService.revokeToken(jti)
        if (!await this.userService.existsUserById(userId)) {
            throw applicationError(ApplicationErrorCode.AUTHENTICATION_UNAUTHENTICATED)
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { latitude: _omit, longitude: __omit, ip: ___omit, city, region, country } = this.geoIpService.getLocation(IP)
        const location = [city, region, country].filter((el) => !!el).join(', ')
        const fingerprint = this.generateFingerprint(fingerprintData)
        const { sessionId } = await this.sessionService.createSession({ deviceId, IP, fingerprint, location, provider, userId, sessionDeviceInfo }, true)
        await this.sessionService.activateSession(sessionId, userId)
        const accessToken = await this.jwtTools.generateToken(userId, TokenType.AccessToken, sessionId)
        const ws_accessToken = await this.jwtTools.generateToken(userId, TokenType.ws_AccessToken, sessionId)
        return {
            accessToken,
            ws_accessToken,
            sessionId
        }
    }

    public async verifyEmail(email: string): Promise<boolean> {
        return this.userService.existsUserByEmail(email)
    }

    public async performLogout(sessionId: UUID, deviceId: UUID): Promise<void> {
        const jtiList: string[] = await this.sessionService.getJtiListBySessionId(sessionId)
        await this.sessionService.destroySession(sessionId, deviceId)
        await Promise.all(jtiList.map(jti => this.sessionService.revokeToken(jti)))
    }

}
