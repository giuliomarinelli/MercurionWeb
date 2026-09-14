import { ChangeDetectionStrategy, Component } from '@angular/core'
import { SensitiveDataChangeWorkflowComponent } from './sensitive-data-change-workflow.component'

/**
 * These components are deliberately small composition boundaries. The
 * workflow implementation can be replaced independently without making the
 * action shell know about forms, transport or success/error mapping.
 */
@Component({
  selector: 'm-sensitive-email-use-case',
  standalone: true,
  imports: [SensitiveDataChangeWorkflowComponent],
  template: '<m-sensitive-data-change-workflow />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensitiveEmailUseCaseComponent {}

@Component({
  selector: 'm-sensitive-phone-use-case',
  standalone: true,
  imports: [SensitiveDataChangeWorkflowComponent],
  template: '<m-sensitive-data-change-workflow />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensitivePhoneUseCaseComponent {}

@Component({
  selector: 'm-sensitive-password-use-case',
  standalone: true,
  imports: [SensitiveDataChangeWorkflowComponent],
  template: '<m-sensitive-data-change-workflow />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensitivePasswordUseCaseComponent {}

@Component({
  selector: 'm-sensitive-mfa-enable-use-case',
  standalone: true,
  imports: [SensitiveDataChangeWorkflowComponent],
  template: '<m-sensitive-data-change-workflow />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensitiveMfaEnableUseCaseComponent {}

@Component({
  selector: 'm-sensitive-mfa-configure-use-case',
  standalone: true,
  imports: [SensitiveDataChangeWorkflowComponent],
  template: '<m-sensitive-data-change-workflow />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensitiveMfaConfigureUseCaseComponent {}

@Component({
  selector: 'm-sensitive-backup-codes-use-case',
  standalone: true,
  imports: [SensitiveDataChangeWorkflowComponent],
  template: '<m-sensitive-data-change-workflow />',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SensitiveBackupCodesUseCaseComponent {}
