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
import { GeneralUtils } from 'src/general-utils/general-utils';
import { createHash } from 'crypto';
import { GeoIpService, GeoLocation } from './geo-ip.service';

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
        if (!await this.passwordEncoder.compare(password, auth.passwordHash)) {
            throw new RpcException('AuthenticationInvalidCredentials')
        }
        const fingerprint = this.generateFingerprint(fingerprintData)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { city, country, ip, region, ...geoLocation } = this.geoIpService.getLocation(IP)
        const alreadyTrustedLocations: GeoLocation[] = await this.sessionService.getTrustedLocations(auth.userId)
        const isTrustedCurrentLocation: boolean = this.geoIpService.isTrustedLocation(geoLocation as GeoLocation, alreadyTrustedLocations)
        const session = await this.sessionService.createSession({ deviceId, userId: auth.userId, IP, sessionDeviceInfo, fingerprint }, remember)
        const sessionId = session.sessionId
        const inWhiteList: boolean = await this.sessionService.isFingerprintInWhiteList(auth.userId, fingerprint)
        const _enabledMfaStrategies: MfaStrategy[] = await this.mfaService.getEnabledMfaStrategies(auth.userId)
        let needsMfa: boolean = !!_enabledMfaStrategies.length
        const isMfaEnabledBySettings: boolean = needsMfa
        if ((!inWhiteList || !isTrustedCurrentLocation) && !needsMfa) {
            needsMfa = true
        }
        if (!needsMfa) {
            await this.sessionService.activateSession(sessionId)
        }
        const phone: string | nullish = await this.userService.getPhoneNumberById(auth.userId)
        let obscuredEmail = _enabledMfaStrategies.includes(MfaStrategy.EMAIL_OTP) ? this.securityService.maskEmail(email) : undefined
        const obscuredPhoneNumber = phone && _enabledMfaStrategies.includes(MfaStrategy.SMS_OTP) ? this.securityService.maskEmail(phone) : undefined
        let enabledMfaStrategies: string[] = _enabledMfaStrategies.map(val => GeneralUtils.getEnumKeyByValue(MfaStrategy, val)).filter(val => val !== undefined)
        let suspiciousAttempt: boolean = false
        if ((!inWhiteList || !isTrustedCurrentLocation) && !isMfaEnabledBySettings) {
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
    public async performAuthentication(auth: Authentication | Omit<Authentication, 'needsMfa' | 'enabledMfaStrategies' | 'suspiciousAttempt'>, fingerprintData: FingerprintData, ip: string, trustVerify: boolean = false): Promise<string> {
        const { userId, sessionId } = auth
        const accessToken = await this.jwtTools.generateToken(userId, TokenType.AccessToken, sessionId)
        if (await this.mfaService.isMfaEnabled(userId) || trustVerify) { 
            await this.sessionService.activateSession(sessionId)
        }
        const fingerprint: string = this.generateFingerprint(fingerprintData)
        await this.sessionService.addFingerprintToWhiteList(userId, fingerprint)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { city, country, ip: _ip, region, ...geoLocation } = this.geoIpService.getLocation(ip)
        await this.sessionService.addTrustedLocation(userId, geoLocation as GeoLocation)
        return accessToken

    }

    public async verifyEmail(email: string): Promise<boolean> {
        return this.userService.existsUserByEmail(email)
    }

}
