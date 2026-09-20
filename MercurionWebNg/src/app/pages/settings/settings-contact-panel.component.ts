import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { SettingsAccountFacade } from './settings-account.facade'

@Component({
  selector: 'm-settings-contact-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (account.profile(); as profile) {
      <div class="py-6 px-4 space-y-4">
        <h3 class="font-bold text-lg">Contatti</h3>
        <div class="flex justify-between gap-2"><span>E-mail</span><strong>{{ profile.obscuredEmail }}</strong><button type="button" class="underline" (click)="changeEmail()">Modifica</button></div>
        @if (!account.isSso()) {
          <div class="flex justify-between gap-2"><span>Numero di telefono</span><strong>{{ profile.obscuredPhone ?? '―' }}</strong><button type="button" class="underline" (click)="changePhone()">{{ profile.obscuredPhone ? 'Modifica' : 'Aggiungi' }}</button></div>
        }
      </div>
    }
  `,
})
export class SettingsContactPanelComponent {
  readonly account = inject(SettingsAccountFacade)
  private readonly actions = inject(ActionOverlayContextService)

  changeEmail(): void { queueMicrotask(() => this.actions.open('SensitiveDataChange', { innerScope: 'ChangeEmail' })) }
  changePhone(): void {
    queueMicrotask(() => this.actions.open('SensitiveDataChange', { innerScope: this.account.profile()?.obscuredPhone ? 'ChangePhone' : 'AddPhone' }))
  }
}
