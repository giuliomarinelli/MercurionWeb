import { Injectable } from '@nestjs/common';
import { UserRegisterDTO } from 'src/app_modules/user/Models/DTO/user-register.cls.dto';
import { UserService } from 'src/app_modules/user/services/user.service';
import { ConfirmWithObsContDTO } from 'src/Models/confirm-responses.dto';
import { PasswordEncoderService } from './password-encoder.service';
import { SercurityService } from './sercurity.service';
import { ResponseService } from 'src/services/response.service';

@Injectable()
export class AccountService {

    constructor(
        private readonly userService: UserService,
        private readonly passwordEncoder: PasswordEncoderService,
        private readonly securityService: SercurityService,
        private readonly _r: ResponseService
    ) { }

    public async register(registerDTO: UserRegisterDTO): Promise<ConfirmWithObsContDTO | null> {

        const { email, firstName, lastName, password } = registerDTO
        return null
    }

}
