import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { ConfirmChangeDTO, ConfirmDTO, ConfirmWithPhoneMfaFeedback } from 'src/models/confirm-responses.dto';
import { ChangePhoneDTO } from '../models/dto/change-phone.cls.dto';
import { AccountFlowKernel } from './account-flow-kernel';

@Injectable()
export class AccountSensitiveDataUseCase {
  constructor(private readonly account: AccountFlowKernel) {}

  requestEmailChange(userId: UUID, email: string): Promise<ConfirmChangeDTO> {
    return this.account.changeEmail_firstStep_requestTotp(userId, email);
  }

  confirmEmailChange(totp: string, token: string): Promise<ConfirmDTO> {
    return this.account.changeEmail_secondStep_verifyTotp(totp, token);
  }

  requestPhoneDeletion(userId: UUID): Promise<ConfirmChangeDTO> {
    return this.account.deletePhoneNumber_firstStep_requestTotp(userId);
  }

  confirmPhoneDeletion(totp: string, token: string): Promise<ConfirmWithPhoneMfaFeedback> {
    return this.account.deletePhoneNumber_secondStep_verifyTotp(totp, token);
  }

  requestPhoneChange(userId: UUID, change: ChangePhoneDTO): Promise<ConfirmChangeDTO> {
    return this.account.changePhoneNumber_firstStep_requestTotp(userId, change);
  }

  confirmPhoneChange(totp: string, token: string): Promise<ConfirmDTO> {
    return this.account.changePhoneNumber_secondStep_verifyTotp(totp, token);
  }
}
