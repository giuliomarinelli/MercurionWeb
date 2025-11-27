import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { RecoveryCodeDTO } from '../Models/DTO/recovery-code.cls.dto';
import { ConfirmWithRecoveryTokenDTO } from 'src/Models/confirm-responses.dto';
import { AccountService } from '../services/account.service';
import { ResponseService } from 'src/services/response.service';
import { Public } from 'src/metadata/metadata';
import { TurnstileGuard } from '../guards/turnstile.guard';

@Controller('recovery')
export class RecoveryController {

    constructor(
        private readonly accountService: AccountService,
        private readonly _r: ResponseService
    ) { }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('/recovery/1')
    @UseGuards(TurnstileGuard)
    public async accountRecovery_firstStep(@Body(new ValidationPipe({ transform: true })) { code }: RecoveryCodeDTO): Promise<ConfirmWithRecoveryTokenDTO> {
        return {
            ...this._r.ok('Account recovery first step went on successfully'),
            recoveryToken: await this.accountService.recoverAccount_firstStep(code)
        }
    }

}
