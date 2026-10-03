import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { GenderPipe } from '../../pipes/gender.pipe'
import { SettingsAccountFacade } from './settings-account.facade'

@Component({
  selector: 'm-settings-profile-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenderPipe],
  template: `
    @if (account.profile(); as profile) {
      <div class="py-6 px-4 relative">
        <div class="grid grid-cols-1 sm:grid-cols-2 mb-2 sm:mb-0 sm:gap-4">
          <div class="p-1.5 sm:p-4">Nome</div>
          <div class="p-1.5 sm:p-4 flex items-center min-w-0">
            <strong class="truncate">{{ profile.firstName }}</strong>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 mb-2 sm:mb-0 sm:gap-4">
          <div class="p-1.5 sm:p-4">Cognome</div>
          <div class="p-1.5 sm:p-4 flex items-center min-w-0">
            <strong class="truncate">{{ profile.lastName }}</strong>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 mb-2 sm:mb-0 sm:gap-4">
          <div class="p-1.5 sm:p-4">Genere</div>
          <div class="p-1.5 sm:p-4 flex items-center min-w-0">
            <strong class="truncate">{{ profile.gender | gender }}</strong>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 mb-2 sm:mb-0 sm:gap-4">
          <div class="p-1.5 sm:p-4">Lavoro</div>
          <div class="p-1.5 sm:p-4 flex items-center min-w-0">
            <strong class="truncate">{{ profile.job ?? '―' }}</strong>
          </div>
        </div>
        <button type="button" class="underline" (click)="edit()">Modifica anagrafica</button>
      </div>
    }
  `,
})
export class SettingsProfilePanelComponent {
  readonly account = inject(SettingsAccountFacade)
  private readonly actions = inject(ActionOverlayContextService)

  edit(): void {
    queueMicrotask(() => this.actions.open('EssentialProfileRegistryEdit'))
  }
}
