import { Injectable } from '@nestjs/common';
import { UserRegisterDTO } from 'src/app_modules/user/Models/DTO/user-register.cls.dto';
import { ConfirmWithObsContDTO, ConfirmWithRecoveryCodeDTO } from 'src/Models/confirm-responses.dto';
import { AccountFlowKernel } from './account-flow-kernel';

export interface RegisterAccountInput {
  registration: UserRegisterDTO;
}

@Injectable()
export class AccountRegistrationUseCase {
  constructor(private readonly account: AccountFlowKernel) {}

  execute(input: RegisterAccountInput): Promise<ConfirmWithObsContDTO> {
    return this.account.registerUser(input.registration);
  }
}

@Injectable()
export class AccountActivationUseCase {
  constructor(private readonly account: AccountFlowKernel) {}

  execute(activationToken: string): Promise<ConfirmWithRecoveryCodeDTO> {
    return this.account.activateUser(activationToken);
  }
}

@Injectable()
export class AccountEmailAvailabilityQuery {
  constructor(private readonly account: AccountFlowKernel) {}

  execute(email: string): Promise<boolean> {
    return this.account.isUserAvailableByEmail(email);
  }
}
