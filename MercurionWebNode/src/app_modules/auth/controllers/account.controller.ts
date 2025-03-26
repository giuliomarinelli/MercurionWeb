import { BadRequestException, Body, Controller, Patch, Post, Query, ValidationPipe } from '@nestjs/common';
import { UserRegisterDTO } from 'src/app_modules/user/Models/DTO/user-register.cls.dto';
import { Public } from 'src/metadata/metadata';
import { ConfirmDTO, ConfirmWithObsContDTO } from 'src/Models/confirm-responses.dto';
import { AccountService } from '../services/account.service';

@Controller('account')
export class AccountController {

    constructor(private readonly accountService: AccountService) { }

    @Public()
    @Post('/register')
    public async registerUser(@Body(new ValidationPipe({ transform: true })) userRegisterDTO: UserRegisterDTO): Promise<ConfirmWithObsContDTO> {
        return await this.accountService.register(userRegisterDTO)
    }

    @Public()
    @Patch('/activate')
    public async activateAccount(@Query('t') activationToken: string): Promise<ConfirmDTO> {
        if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(activationToken)) {
            throw new BadRequestException('Invalid t param pattern')
        }
        return await this.accountService.activate(activationToken)
    }

}
