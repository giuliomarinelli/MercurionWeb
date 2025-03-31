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

@Injectable()
export class AuthenticationService {

    constructor(
        private readonly passwordEncoder: PasswordEncoderService,
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly mfaService: MfaService,
        private readonly jwtTools: JwtToolsService,
        private readonly _r: ResponseService
    ) { }

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
        return {
            userId: auth.userId,
            sessionId
        }

    }

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
