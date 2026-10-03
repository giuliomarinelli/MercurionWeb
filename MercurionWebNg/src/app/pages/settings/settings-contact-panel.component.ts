import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { SettingsAccountFacade } from './settings-account.facade'

@Component({
  selector: 'm-settings-contact-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (account.profile(); as profile) {
      <div class="py-6 px-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 mb-4 2xs:mb-2 sm:gap-4 relative">
          <div class="text-xs 2xs:text-base p-2 sm:p-4 sm:col-span-1">
            @if (profile.accountIdKind === 'email') {
              E-mail
            } @else {
              ORCID
            }
          </div>
          <div class="text-xs 2xs:text-base p-2 sm:p-4 sm:col-span-2 flex justify-between items-center gap-2 min-w-0">
            <strong class="truncate">{{ profile.obscuredAccountId }}</strong>
            @if (!account.isSso()) {
              <button type="button" class="underline" (click)="changeEmail()">Modifica</button>
            }
          </div>
        </div>
        @if (!account.isSso()) {
          <div class="grid grid-cols-1 sm:grid-cols-3 mb-4 2xs:mb-2 sm:gap-4 relative">
            <div class="text-xs 2xs:text-base p-2 sm:p-4 sm:col-span-1">Numero di telefono</div>
            <div class="text-xs 2xs:text-base p-2 sm:p-4 sm:col-span-2 flex justify-between items-center gap-2 min-w-0">
              <strong class="truncate">{{ profile.obscuredPhone ?? '―' }}</strong>
              @if (profile.obscuredPhone) {
                <div class="flex items-center gap-4">
                  <button type="button" class="underline" (click)="changePhone()">Modifica</button>
                  <button type="button" class="underline" (click)="deletePhone()">Elimina numero di telefono</button>
                </div>
              } @else {
                <button type="button" class="underline" (click)="addPhone()">Aggiungi</button>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class SettingsContactPanelComponent {
  readonly account = inject(SettingsAccountFacade)
  private readonly actions = inject(ActionOverlayContextService)

  changeEmail(): void {
    queueMicrotask(() => this.actions.open('SensitiveDataChange', { innerScope: 'ChangeEmail' }))
  }
  addPhone(): void {
    queueMicrotask(() => this.actions.open('SensitiveDataChange', { innerScope: 'AddPhone' }))
  }
  deletePhone(): void {
    queueMicrotask(() => this.actions.open('SensitiveDataChange', { innerScope: 'RemovePhone' }))
  }
  changePhone(): void {
    queueMicrotask(() =>
      this.actions.open('SensitiveDataChange', {
        innerScope: this.account.profile()?.obscuredPhone ? 'ChangePhone' : 'AddPhone',
      }),
    )
  }
}
