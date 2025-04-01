import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';
import { BadRequestException, Body, Controller, Param, Patch, Post, Query, ValidationPipe } from '@nestjs/common';
import { UserRegisterDTO } from 'src/app_modules/user/Models/DTO/user-register.cls.dto';
import { AuthenticatedUserId, Public } from 'src/metadata/metadata';
import { ConfirmDTO, ConfirmMfaChange, ConfirmWithObsContDTO } from 'src/Models/confirm-responses.dto';
import { AccountService } from '../services/account.service';
import { GeneralUtils } from 'src/general-utils/general-utils';
import { ResponseService } from 'src/services/response.service';
import { MfaService } from '../services/mfa.service';
import { UUID } from 'crypto';

@Controller('account')
export class AccountController {

    constructor(
        private readonly accountService: AccountService,
        private readonly _r: ResponseService,
        private readonly mfaService: MfaService
    ) { }

    private validateMfaStrategy(strategyKey: string | undefined): MfaStrategy | never {
        if (!strategyKey) {
            throw new BadRequestException('strategy is required')
        }
        const strategy = GeneralUtils.getEnumValueFromStringKey(MfaStrategy, strategyKey)
        if (!strategy) {
            throw new BadRequestException('Invalid strategy')
        }
        return strategy
    }

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

    @Patch('/mfa/enable/1/:strategy')
    public async enableMfa_firstStep(
        @Param('strategy') strategyKey: string | undefined,
        @AuthenticatedUserId() userId: UUID
    ): Promise<ConfirmMfaChange> {
        const strategy = this.validateMfaStrategy(strategyKey)
        return {
            ...this._r.ok(`MFA with strategy ${strategyKey} successfully enabled`),
            ...await this.mfaService.enableMfa_firstStep(userId, strategy)
        }
    }


}
