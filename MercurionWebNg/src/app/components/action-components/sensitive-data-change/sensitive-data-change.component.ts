import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core'
import { ActionOverlayContextService } from '../../../services/context/action-context/action-overlay-context.service'
import { SensitiveDataChangeContextService } from '../../../services/context/action-context/sensitive-data-change-context.service'
import type { ActiveSensitiveDataChangeInnerScope } from '../../../Models/action/action-overlay.models'
import {
  SensitiveBackupCodesUseCaseComponent,
  SensitiveEmailUseCaseComponent,
  SensitiveMfaConfigureUseCaseComponent,
  SensitiveMfaEnableUseCaseComponent,
  SensitivePasswordUseCaseComponent,
  SensitivePhoneUseCaseComponent,
} from './sensitive-data-use-case.components'
import { sensitiveDataUseCaseFor } from './sensitive-data-change.models'

@Component({
  selector: 'm-sensitive-data-change',
  standalone: true,
  imports: [
    SensitiveEmailUseCaseComponent,
    SensitivePhoneUseCaseComponent,
    SensitivePasswordUseCaseComponent,
    SensitiveMfaEnableUseCaseComponent,
    SensitiveMfaConfigureUseCaseComponent,
    SensitiveBackupCodesUseCaseComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (useCase(); as selected) {
      @switch (selected.kind) {
        @case ('email') { <m-sensitive-email-use-case /> }
        @case ('phone') { <m-sensitive-phone-use-case /> }
        @case ('password') { <m-sensitive-password-use-case /> }
        @case ('mfa-enable') { <m-sensitive-mfa-enable-use-case /> }
        @case ('mfa-configure') { <m-sensitive-mfa-configure-use-case /> }
        @case ('backup-codes') { <m-sensitive-backup-codes-use-case /> }
      }
    }
  `,
})
export class SensitiveDataChangeComponent {
  private readonly overlay = inject(ActionOverlayContextService)
  private readonly context = inject(SensitiveDataChangeContextService)

  readonly scope = computed(
    () => this.context.innerScope() as ActiveSensitiveDataChangeInnerScope,
  )
  readonly useCase = computed(() => {
    const scope = this.scope()
    return scope ? sensitiveDataUseCaseFor(scope) : null
  })

  close(): void {
    const session = this.overlay.session('SensitiveDataChange')
    if (session) this.overlay.close(session.id)
  }
}
