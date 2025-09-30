import { ChangePasswordDTO } from './../Models/DTO/change-password.dto';
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';
import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { UserRegisterDTO } from 'src/app_modules/user/Models/DTO/user-register.cls.dto';
import { AuthenticatedUserId, Authorization, Public } from 'src/metadata/metadata';
import { ConfirmChangeDTO, ConfirmDTO, ConfirmMfaChange, ConfirmWithObsContDTO } from 'src/Models/confirm-responses.dto';
import { AccountService } from '../services/account.service';
import { GeneralUtils } from 'src/general-utils/general-utils';
import { ResponseService } from 'src/services/response.service';
import { MfaService } from '../services/mfa.service';
import { UUID } from 'crypto';
import { TotpDTO } from '../Models/DTO/totp.cls.dto';
import { ChangePhoneDTO } from '../Models/DTO/change-phone.cls.dto';
import { EmailDTO } from '../Models/DTO/change-email.cls.dto';
import { UserService } from 'src/app_modules/user/services/user.service';


@Controller('account')
export class AccountController {

    constructor(
        private readonly accountService: AccountService,
        private readonly _r: ResponseService,
        private readonly mfaService: MfaService,
        private readonly userService: UserService
    ) { }

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

    @Patch('/email/1')
    public async changeEmail_firstStep(
        @AuthenticatedUserId() userId: UUID,
        @Body(new ValidationPipe({ transform: true })) dto: EmailDTO
    ): Promise<ConfirmChangeDTO> {
        return await this.accountService.changeEmail_firstStep_requestTotp(userId, dto.email)
    }

    @Patch('/email/2')
    public async changeEmail_secondStep(
        @Body(new ValidationPipe({ transform: true })) dto: TotpDTO
    ): Promise<ConfirmDTO> {
        const { totp, secureToken } = dto
        const isValid = await this.accountService.changeEmail_secondStep_verifyTotp(totp, secureToken);
        if (!isValid) throw new UnauthorizedException('Invalid TOTP code')
        return this._r.ok('Email changed successfully')
    }

    @Patch('/phone/1')
    public async changePhoneNumber_firstStep(
        @AuthenticatedUserId() userId: UUID,
        @Body(new ValidationPipe({ transform: true })) dto: ChangePhoneDTO
    ): Promise<ConfirmChangeDTO> {
        return await this.accountService.changePhoneNumber_firstStep_requestTotp(userId, dto)
    }

    @Patch('/phone/2')
    public async changePhoneNumber_secondStep(
        @Body(new ValidationPipe({ transform: true })) dto: TotpDTO
    ): Promise<ConfirmDTO> {
        const { totp, secureToken } = dto
        const isValid = await this.accountService.changePhoneNumber_secondStep_verifyTotp(totp, secureToken)
        if (!isValid) throw new UnauthorizedException('Invalid TOTP code')
        return this._r.ok('Phone number changed successfully')
    }

    @Patch('/mfa/enable/:strategy/1')
    public async enableMfa_firstStep(
        @Param('strategy') strategyKey: string | undefined,
        @AuthenticatedUserId() userId: UUID
    ): Promise<ConfirmMfaChange> {
        const strategy: MfaStrategy = GeneralUtils.validateMfaStrategy(strategyKey)
        return {
            ...this._r.ok(`OTP sent or QR generated for MFA strategy ${strategyKey}`),
            ...await this.mfaService.enableMfa_firstStep(userId, strategy)
        }
    }

    @Patch('/mfa/enable/:strategy/2')
    public async enableMfa_secondStep(
        @Param('strategy') strategyKey: string | undefined,
        @Body(new ValidationPipe({ transform: true })) totpDTO: TotpDTO
    ): Promise<ConfirmDTO> {
        const strategy: MfaStrategy = GeneralUtils.validateMfaStrategy(strategyKey)
        const { totp, secureToken } = totpDTO
        const isValid: boolean = await this.mfaService.enableMfa_secondStep_verifyTotpAndAppendStrategy(totp, secureToken, strategy)
        if (!isValid) {
            throw new UnauthorizedException('Invalid MFA Code')
        }
        return this._r.ok(`MFA successfully enabled for strategy ${strategyKey}`)
    }

    @Patch('/mfa/disable/:strategy/1')
    public async disableMfa_firstStep(
        @Param('strategy') strategyKey: string | undefined,
        @AuthenticatedUserId() userId: UUID
    ): Promise<ConfirmMfaChange> {
        const strategy: MfaStrategy = GeneralUtils.validateMfaStrategy(strategyKey)
        return {
            ...this._r.ok(`OTP sent or QR check enabled for MFA strategy ${strategyKey}`),
            ...await this.mfaService.disableMfa_firstStep(userId, strategy)
        }
    }

    @Patch('/mfa/disable/:strategy/2')
    public async disableMfa_secondStep(
        @Param('strategy') strategyKey: string | undefined,
        @Body(new ValidationPipe({ transform: true })) totpDTO: TotpDTO
    ): Promise<ConfirmDTO> {
        const strategy: MfaStrategy = GeneralUtils.validateMfaStrategy(strategyKey)
        const { totp, secureToken } = totpDTO
        const isValid: boolean = await this.mfaService.disableMfa_secondStep_verifyTotpAndRemoveStrategy(totp, secureToken, strategy)
        if (!isValid) {
            throw new UnauthorizedException('Invalid MFA Code')
        }
        return this._r.ok(`MFA successfully disabled for strategy ${strategyKey}`)
    }

    @Get('/email')
    public async getEmail(@AuthenticatedUserId() userId: UUID): Promise<string> {
        const email = await this.userService.getUserEmailById(userId)
        if (email == null) {
            throw new NotFoundException('EmailNotFound')
        }
        return email
    }

    @Patch('/password')
    public async changePassword(
        @Body() dto: ChangePasswordDTO,
        @AuthenticatedUserId() userId: UUID
    ): Promise<ConfirmDTO> {
        // eslint-disable-next-line prefer-const
        let { oldPassword, newPassword } = dto
        if (!oldPassword) {
            oldPassword = ''
        }
        await this.accountService.changePassword(oldPassword, newPassword, userId)
        return this._r.ok('Password changed successfully')
    }

    @Post('/forgotten-password')
    public async forgottenPassword(@Body() dto: EmailDTO): Promise<ConfirmDTO> {
        const { email } = dto
        await this.accountService.sendForgottenPasswordLink(email)
        return this._r.ok('Password recovery link sent to user email')
    }

    @Post('/password-recovery')
    public async passwordRecovery(
        @Authorization() changePasswordToken: string,
        @Body() changePasswordDTO: ChangePasswordDTO
    ): Promise<ConfirmDTO> {
        const { newPassword } = changePasswordDTO
        await this.accountService.forgottenPassword(newPassword, changePasswordToken)
        return this._r.ok('Password changed successfully')
    }

}
