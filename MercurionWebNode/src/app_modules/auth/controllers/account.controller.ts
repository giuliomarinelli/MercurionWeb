import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { UserRegisterDTO } from 'src/app_modules/user/Models/DTO/user-register.cls.dto';
import { Public } from 'src/metadata/metadata';
import { ConfirmWithObsContDTO } from 'src/Models/confirm-responses.dto';
import { AccountService } from '../services/account.service';

@Controller('account')
export class AccountController {

    constructor(private readonly accountService: AccountService) { }

    @Public()
    @Post('/register')
    public async registerUser(@Body(new ValidationPipe({ transform: true })) userRegisterDTO: UserRegisterDTO): Promise<ConfirmWithObsContDTO> {
        return await this.accountService.register(userRegisterDTO)
    }

}
