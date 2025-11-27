import { ChangePasswordDTO } from './../Models/DTO/change-password.dto';
import { MfaStrategy } from 'src/app_modules/user/Models/enums/mfa-strategy.enum';
import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query, UnauthorizedException, UseGuards, ValidationPipe } from '@nestjs/common';
import { UserRegisterDTO } from 'src/app_modules/user/Models/DTO/user-register.cls.dto';
import { AuthenticatedUserId, Authorization, Public, SessionId } from 'src/metadata/metadata';
import { ConfirmChangeDTO, ConfirmDTO, ConfirmMfaChange, ConfirmWithObsContDTO, ConfirmWithRecoveryCodeDTO } from 'src/Models/confirm-responses.dto';
import { AccountService } from '../services/account.service';
import { GeneralUtils } from 'src/utils/general-utils/general-utils';
import { ResponseService } from 'src/services/response.service';
import { MfaService } from '../services/mfa.service';
import { UUID } from 'crypto';
import { TotpDTO } from '../Models/DTO/totp.cls.dto';
import { ChangePhoneDTO } from '../Models/DTO/change-phone.cls.dto';
import { EmailDTO } from '../Models/DTO/email.cls.dto';
import { UserService } from 'src/app_modules/user/services/user.service';
import { TurnstileGuard } from '../guards/turnstile.guard';
import { SercurityService } from '../services/sercurity.service';
import { ProfileDTO, ProfileRegistryDTO } from '../Models/DTO/profile.dtos';
import { SessionService } from '../services/session.service';
import { SessionDTO } from '../Models/DTO/session.dto';
import { BackupCodeStatusDTO } from 'src/app_modules/user/Models/DTO/backup-code-status.dto';
import { RpcException } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';



@Controller('account')
export class AccountController {

    constructor(
        private readonly accountService: AccountService,
        private readonly _r: ResponseService,
        private readonly mfaService: MfaService,
        private readonly userService: UserService,
        private readonly securityService: SercurityService,
        private readonly sessionService: SessionService,
        private readonly configService: ConfigService
    ) { }

    @Public()
    @Post('/register')
    public async registerUser(@Body(new ValidationPipe({ transform: true })) userRegisterDTO: UserRegisterDTO): Promise<ConfirmWithObsContDTO> {
        return await this.accountService.registerUser(userRegisterDTO)
    }

    @Public()
    @Patch('/activate')
    public async activateAccount(@Query('t') activationToken: string): Promise<ConfirmWithRecoveryCodeDTO> {
        if (!/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(activationToken)) {
            throw new BadRequestException('Invalid t param pattern')
        }
        return this.accountService.activateUser(activationToken)
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
        return this.accountService.changePhoneNumber_firstStep_requestTotp(userId, dto)
    }

    @Delete('/phone/1')
    public async deletePhoneNumber_firstStep(@AuthenticatedUserId() userId: UUID): Promise<ConfirmChangeDTO> {
        return this.accountService.deletePhoneNumber_firstStep_requestTotp(userId)
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
            ...this._r.ok(`OTP sent or QR generated and secure_token generated for MFA strategy ${strategyKey}`),
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
            ...this._r.ok(`OTP sent and/or secure_token generated for MFA strategy ${strategyKey}`),
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

    @Public()
    @UseGuards(TurnstileGuard)
    @HttpCode(HttpStatus.OK)
    @Post('/forgotten-password')
    public async forgottenPassword(@Body() dto: EmailDTO): Promise<ConfirmWithObsContDTO> {
        const { email } = dto
        try {
            await this.accountService.sendForgottenPasswordLink(email)
        } catch (e) {
            if (e instanceof RpcException && e.message === 'PasswordResetSend::TooManyRequests') {
                throw e
            }
            // pass
        }
        return {
            ...this._r.ok('Password recovery link sent to user email'),
            obscuredEmail: this.securityService.maskEmail(email)
        }
    }

    @Public()
    @Patch('/password-recovery')
    public async passwordRecovery(
        @Authorization() changePasswordToken: string,
        @Body() changePasswordDTO: ChangePasswordDTO
    ): Promise<ConfirmDTO> {
        const { newPassword } = changePasswordDTO
        await this.accountService.forgottenPassword(newPassword, changePasswordToken)
        return this._r.ok('Password changed successfully')
    }

    @Public()
    @Get('/is-authorized-to-recover-password')
    isAuthorizedToRecoverPassword(
        @Authorization() changePasswordToken: string
    ): Promise<boolean> {
        return this.accountService.isAuthorizedToRecoverPassword(changePasswordToken)
    }

    @Get('/profile-registry')
    async getProfileRegistry(
        @AuthenticatedUserId() userId: UUID,
        @Query('get_recent_history') getRecentHistory = 'true'
    ): Promise<ProfileDTO> {
        const result = await this.userService.getVerifiedUserProfileById(userId, getRecentHistory === 'true')
        if (!result) {
            throw new NotFoundException('UserNotFound')
        }
        return result
    }

    @Patch('/profile-registry')
    async updateProfileRegistry(
        @AuthenticatedUserId() userId: UUID,
        @Body(new ValidationPipe({ transform: true })) dto: ProfileRegistryDTO
    ): Promise<ProfileRegistryDTO> {
        const result = await this.userService.updateVerifiedUserProfileRegistryById(userId, dto)
        if (!result) {
            throw new NotFoundException('UserNotFound::{updated: false}')
        }
        return result
    }

    @Public()
    @HttpCode(HttpStatus.OK)
    @Post('/is-email-available')
    async isEmailAvailable(@Body(new ValidationPipe({ transform: true })) { email }: EmailDTO): Promise<boolean> {
        return this.accountService.isUserAvailableByEmail(email)
    }

    @Get('/active-sessions')
    public async getActiveSessions(
        @AuthenticatedUserId() userId: UUID,
        @SessionId() sessionId: UUID
    ): Promise<SessionDTO[]> {
        return this.sessionService.getAllActiveSessionsByUserIdAsDTOs(userId, sessionId)
    }

    @Get('/mfa/backup/status')
    public async getBackupCodesStatus(
        @AuthenticatedUserId() userId: UUID
    ): Promise<BackupCodeStatusDTO> {
        return this.mfaService.getBackupCodesStatus(userId)
    }

    @Patch('/mfa/backup/regenerate')
    @HttpCode(HttpStatus.OK)
    public async regenerateBackupCodes(
        @AuthenticatedUserId() userId: UUID
    ): Promise<{ codes: string[] }> {

        const strategies = await this.mfaService.getEnabledMfaStrategies(userId)
        if (!strategies.length) {
            throw new RpcException('BackupCodes::MfaNotEnabled')
        }

        const codes = await this.mfaService.regenerateBackupCodes(userId)

        // volendo si può anche loggare un evento di sicurezza o mandare email
        // "Sono stati rigenerati i codici di backup del tuo account"
        // TODO maybe

        return { codes }
    }

    @Get('/is-mfa-enabled')
    public async isMfaEnabled(@AuthenticatedUserId() userId: UUID): Promise<boolean> {
        return this.mfaService.isMfaEnabled(userId)
    }

    @Get('/mfa-active-strategies')
    public async getMfaActiveStrategies(@AuthenticatedUserId() userId: UUID): Promise<string[]> {
        return (await this.mfaService.getEnabledMfaStrategies(userId))
            .map((val) => GeneralUtils.getEnumKeyByValue(MfaStrategy, val))
            .filter((key) => key != undefined)
    }

    @Get('/current-version')
    public getCurrentVersion(): string {
        return this.configService.get<string>('App.version')!
    }

    @Get('/masked-email')
    public async getMaskedEmail(@AuthenticatedUserId() userId: UUID): Promise<string> {
        const email = await this.userService.getUserEmailById(userId)
        if (!email) {
            throw new NotFoundException('Fatal::email not found')
        }
        return this.securityService.maskEmail(email)
    }

    @Get('/masked-phone')
    public async getMaskedPhone(@AuthenticatedUserId() userId: UUID): Promise<string | null> {
        const completePhone = await this.userService.getPhoneNumberById(userId)
        if (!completePhone) {
            return null
        }
        return this.securityService.maskPhone(completePhone)
    }

    @Post('/mask-email')
    public maskEmail(@Body(new ValidationPipe()) { email }: EmailDTO): string {
        return this.securityService.maskEmail(email)
    }

    @Post('/mask-phone')
    public maskPhone(@Body(new ValidationPipe()) { internationalPrefix, phoneNumber }: ChangePhoneDTO): string {
        const phone = internationalPrefix.trim() + phoneNumber.trim()
        return this.securityService.maskPhone(phone)
    }

}
