import { Authentication } from './../Models/interfaces/authentication.interface';
import { UserService } from 'src/app_modules/user/services/user.service';
import { Injectable } from '@nestjs/common';
import { PasswordEncoderService } from './password-encoder.service';

@Injectable()
export class AuthenticationService {

    constructor(
        private readonly passwordEncoder: PasswordEncoderService,
        private readonly userService: UserService
    ) { }

    public async emailAndPasswordAuthentication(email: string, password: string): Promise<Authentication> {

        const {id: userId} = await this.userService.g

    }

}
