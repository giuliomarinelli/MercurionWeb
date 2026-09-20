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
      <div class="py-6 px-4 space-y-3">
        <h3 class="font-bold text-lg">Anagrafica</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><span>Nome</span><strong>{{ profile.firstName }}</strong></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><span>Cognome</span><strong>{{ profile.lastName }}</strong></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><span>Genere</span><strong>{{ profile.gender | gender }}</strong></div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><span>Lavoro</span><strong>{{ profile.job ?? '―' }}</strong></div>
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
