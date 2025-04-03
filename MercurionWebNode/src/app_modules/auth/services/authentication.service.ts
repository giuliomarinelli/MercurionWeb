import { Authentication } from './../Models/interfaces/authentication.interface';
import { UserService } from 'src/app_modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import { PasswordEncoderService } from './password-encoder.service';
import { RpcException } from '@nestjs/microservices';
import { SessionService } from './session.service';
import { ISessionDeviceInfo } from '../Models/interfaces/i-session.interface';
import { MfaService } from './mfa.service';
import { JwtToolsService } from './jwt-tools.service';
import { ConfirmWithAccessTokenDTO } from 'src/Models/confirm-responses.dto';
import { TokenType } from '../Models/enums/token-type.enum';
import { ResponseService } from 'src/services/response.service';
import { SercurityService } from './sercurity.service';
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';
import { nullish } from 'src/Models/nullish.type';

@Injectable()
export class AuthenticationService {

    constructor(
        private readonly passwordEncoder: PasswordEncoderService,
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly securityService: SercurityService,
        private readonly mfaService: MfaService,
        private readonly jwtTools: JwtToolsService,
        private readonly _r: ResponseService
    ) { }

    // Restituisce un oggetto Authentication necessario per generare un token JWT
    public async emailAndPasswordAuthentication(email: string, password: string, remember: boolean, IP: string, deviceId: string, sessionDeviceInfo: ISessionDeviceInfo): Promise<Authentication> {

        const auth = await this.userService.getVerifiedUserAuthByEmail(email)
        if (!auth || !auth.userId || !auth.passwordHash) {
            throw new RpcException('AuthenticationInvalidCredentials')
        }
        if (!await this.passwordEncoder.compare(password, auth.passwordHash)) {
            throw new RpcException('AuthenticationInvalidCredentials')
        }
        const { sessionId } = await this.sessionService.createSession({ deviceId, userId: auth.userId, IP, sessionDeviceInfo }, remember)
        if (!await this.mfaService.isMfaEnabled(auth.userId)) {
            await this.sessionService.activateSession(sessionId)
        }
        const enabledMfaStrategies: MfaStrategy[] = await this.mfaService.getEnabledMfaStrategies(auth.userId)
        const phone: string | nullish = await this.userService.getPhoneNumberById(auth.userId)
        const obscuredEmail = enabledMfaStrategies.includes(MfaStrategy.EMAIL_OTP) ? this.securityService.maskEmail(email) : undefined
        const obscuredPhoneNumber = phone && enabledMfaStrategies.includes(MfaStrategy.SMS_OTP) ? this.securityService.maskEmail(phone) : undefined
        return {
            userId: auth.userId,
            sessionId,
            needsMfa: await this.mfaService.isMfaEnabled(auth.userId),
            enabledMfaStrategies
        }

    }

    // Restituisce un PreAuthorizationToken da un oggetto Authentication dopo che il primo fattore di autenticazione è andato a buon fine
    public async performPreAuthenticationForMfa(auth: Authentication): Promise<string> {

        const { userId, sessionId } = auth
        return await this.jwtTools.generateToken(userId, TokenType.PreAuthorizationToken, sessionId)

    }

    // Restituisce un DTO di risposta con l'Access Token e se l'utente ha MFA attiva, attiva anche la sessione
    public async performAuthentication(auth: Authentication): Promise<ConfirmWithAccessTokenDTO> {
        const { userId, sessionId } = auth
        const accessToken = await this.jwtTools.generateToken(userId, TokenType.AccessToken, sessionId)
        if (await this.mfaService.isMfaEnabled(userId)) {
            await this.sessionService.activateSession(sessionId)
        }
        return {
            ...this._r.ok('Authenticated successfully'),
            accessToken
        }
    }

}
