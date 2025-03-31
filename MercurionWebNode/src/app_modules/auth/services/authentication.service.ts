import { Authentication } from './../Models/interfaces/authentication.interface';
import { UserService } from 'src/app_modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import { PasswordEncoderService } from './password-encoder.service';
import { RpcException } from '@nestjs/microservices';
import { SessionService } from './session.service';
import { ISessionDeviceInfo } from '../Models/interfaces/i-session.interface';

@Injectable()
export class AuthenticationService {

    constructor(
        private readonly passwordEncoder: PasswordEncoderService,
        private readonly userService: UserService,
        private readonly sessionService: SessionService
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
        return {
            userId: auth.userId,
            sessionId
        }

    }

}
