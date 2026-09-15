import { Injectable } from '@nestjs/common';
import { RecoverCredentialsDTO } from '../Models/DTO/recover-cretentials.cls.dto';
import { AccountFlowKernel } from './account-flow-kernel';

@Injectable()
export class AccountRecoveryUseCase {
  constructor(private readonly account: AccountFlowKernel) {}

  firstStep(code: string): Promise<string> {
    return this.account.recoverAccount_firstStep(code);
  }

  secondStep(input: RecoverCredentialsDTO, secureToken: string): Promise<string> {
    return this.account.recoverAccount_secondStep(input, secureToken);
  }
}
