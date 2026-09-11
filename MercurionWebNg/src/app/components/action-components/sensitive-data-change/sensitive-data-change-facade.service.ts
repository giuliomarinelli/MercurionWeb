import { Injectable, inject } from '@angular/core'
import type { MfaStrategy } from '../../../Models/account/account.models'
import { AccountService } from '../../../services/account.service'

/**
 * Narrow command surface shared by sensitive-data use cases.
 *
 * Use cases depend on this contract rather than reaching into the account and
 * authentication services themselves. The existing endpoint semantics,
 * re-authentication and MFA checks remain owned by AccountService.
 */
@Injectable({ providedIn: 'root' })
export class SensitiveDataChangeFacade {
  private readonly account = inject(AccountService)

  readonly getProvidedEmail = () => this.account.getProvidedEmail()
  readonly getMaskedEmail = () => this.account.getMaskedEmail()
  readonly getMaskedPhone = () => this.account.getMaskedPhone()
  readonly getEnabledMfaStrategies = (preauth = false) => this.account.getEnabledMfaStrategies(preauth)
  readonly getRemainingBackupCodes = () => this.account.getRemainingBackupCodes()
  readonly getBackupCodes = () => this.account.getBackupCodes()
  readonly maskEmail = (email: string) => this.account.maskEmail(email)

  readonly changePassword = (dto: Parameters<AccountService['changePassword']>[0]) =>
    this.account.changePassword(dto)
  readonly changeEmailFirstStep = (email: string) => this.account.changeEmail_firstStep(email)
  readonly changeEmailSecondStep = (otp: string, token: string) =>
    this.account.changeEmail_secondStep(otp, token)
  readonly changePhoneFirstStep = (prefix: string, phone: string) =>
    this.account.changePhoneNumber_firstStep(prefix, phone)
  readonly changePhoneSecondStep = (otp: string, token: string) =>
    this.account.changePhoneNumber_secondStep(otp, token)
  readonly deletePhoneFirstStep = () => this.account.deletePhoneNumber_firstStep()
  readonly deletePhoneSecondStep = (otp: string, token: string) =>
    this.account.deletePhoneNumber_secondStep(otp, token)
  readonly enableMfaFirstStep = (strategy: MfaStrategy) => this.account.enableMfa_firstStep(strategy)
  readonly enableMfaSecondStep = (strategy: MfaStrategy, otp: string, token: string) =>
    this.account.enableMfa_secondStep(strategy, otp, token)
  readonly disableMfaFirstStep = (strategy: MfaStrategy) => this.account.disableMfa_firstStep(strategy)
  readonly disableMfaSecondStep = (strategy: MfaStrategy, otp: string, token: string) =>
    this.account.disableMfa_secondStep(strategy, otp, token)
}
