import { FingerprintData } from 'src/app_modules/auth/Models/DTO/fingerprints.dtos';
import { Authentication } from './../Models/interfaces/authentication.interface';
import { UserService } from 'src/app_modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import { PasswordEncoderService } from './password-encoder.service';
import { RpcException } from '@nestjs/microservices';
import { SessionService } from './session.service';
import { ISessionDeviceInfo } from '../Models/interfaces/i-session.interface';
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
        private readonly geoIpService: GeoIpService
    ) { }

    private generateFingerprint(fingerprintData: FingerprintData): string {
        return createHash('sha256').update(JSON.stringify(fingerprintData)).digest('hex')
    }

    // Restituisce un oggetto Authentication necessario per generare un token JWT
    public async emailAndPasswordAuthentication(email: string,
        password: string,
        remember: boolean,
        IP: string,
        deviceId: string,
        sessionDeviceInfo: ISessionDeviceInfo,
        fingerprintData: FingerprintData): Promise<Authentication> {

        const auth: IAuth | nullish = await this.userService.getVerifiedUserAuthByEmail(email)
        if (!auth || !auth.userId || !auth.passwordHash) {
            throw new RpcException('AuthenticationInvalidCredentials')
        }
        const cmp = await this.passwordEncoder.compareWithFallback(password, auth.passwordHash, true);
        if (cmp === CompareResult.NoMatch) {
            throw new RpcException('AuthenticationInvalidCredentials');
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
        const session = await this.sessionService.createSession({ deviceId, userId: auth.userId, IP, sessionDeviceInfo, fingerprint, location }, remember)
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
        let enabledMfaStrategies: string[] = _enabledMfaStrategies.map(val => GeneralUtils.getEnumKeyByValue(MfaStrategy, val)).filter(val => val !== undefined)
        let suspiciousAttempt: boolean = false
        if ((!inWhiteList || !isTrustedCurrentLocation || unknwonDeviceId) && !isMfaEnabledBySettings) {
            enabledMfaStrategies = ['EMAIL_OTP']
            suspiciousAttempt = true
            obscuredEmail = this.securityService.maskEmail(email)
        }
        return {
            userId: auth.userId,
            sessionId,
            needsMfa,
            enabledMfaStrategies,
            obscuredEmail,
            obscuredPhoneNumber,
            suspiciousAttempt
        }

    }

    // Restituisce un PreAuthorizationToken da un oggetto Authentication dopo che il primo fattore di autenticazione è andato a buon fine
    public async performPreAuthenticationForMfa(auth: Authentication): Promise<string> {

        const { userId, sessionId } = auth
        return await this.jwtTools.generateToken(userId, TokenType.PreAuthorizationToken, sessionId)

    }

    // Restituisce un DTO di risposta con l'Access Token e se l'utente ha MFA attiva, attiva anche la sessione
    public async performAuthentication(auth: Authentication | Omit<Authentication, 'needsMfa' | 'enabledMfaStrategies' | 'suspiciousAttempt'>, fingerprintData: FingerprintData, ip: string, trustVerify: boolean = false): Promise<TokenPair> {
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
        throw new RpcException('InvalidSession')
    }

    public async verifyEmail(email: string): Promise<boolean> {
        return this.userService.existsUserByEmail(email)
    }

    public async performLogout(sessionId: UUID, deviceId: UUID): Promise<void> {
        const jtiList: string[] = await this.sessionService.getJtiListBySessionId(sessionId as string)
        await this.sessionService.destroySession(sessionId as string, deviceId as string)
        await Promise.all(jtiList.map(jti => this.sessionService.revokeToken(jti)))
    }

}
