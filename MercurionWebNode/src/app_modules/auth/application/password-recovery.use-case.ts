import { Injectable } from '@nestjs/common';
import { UUID } from 'crypto';
import { AccountFlowKernel } from './account-flow-kernel';

export interface ChangePasswordInput {
  userId: UUID;
  oldPassword: string;
  newPassword: string;
}

@Injectable()
export class PasswordChangeUseCase {
  constructor(private readonly account: AccountFlowKernel) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    await this.account.changePassword(input.oldPassword, input.newPassword, input.userId);
  }
}

@Injectable()
export class PasswordRecoveryUseCase {
  constructor(private readonly account: AccountFlowKernel) {}

  sendResetLink(email: string): Promise<void> {
    return this.account.sendForgottenPasswordLink(email);
  }

  completeReset(newPassword: string, token: string): Promise<void> {
    return this.account.forgottenPassword(newPassword, token);
  }

  isAuthorized(token: string): Promise<boolean> {
    return this.account.isAuthorizedToRecoverPassword(token);
  }
}
