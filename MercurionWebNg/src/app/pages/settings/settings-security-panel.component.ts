import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core'
import { ButtonComponent } from '../../components/common/button/button.component'
import { MfaStrategyCardComponent } from '../../components/common/mfa-strategy-card/mfa-strategy-card.component'
import { SessionCardComponent } from '../../components/common/session-card/session-card.component'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { SettingsAccountFacade } from './settings-account.facade'
import { SettingsSecurityFacade } from './settings-security.facade'

@Component({
  selector: 'm-settings-security-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent, MfaStrategyCardComponent, SessionCardComponent],
  providers: [SettingsSecurityFacade],
  template: `
    <div class="py-6 px-4 space-y-6">
      <section>
        <h3 class="font-bold text-lg">Password e sessioni</h3>
        @if (!account.isSso()) {
          <m-button type="button" variant="secondary" size="md" (click)="changePassword()">Cambia password</m-button>
        }
        <h4 class="font-bold text-base mt-4 mb-3">Sessioni attive</h4>
        <div class="flex flex-col gap-y-4">
          @for (session of security.sessions(); track session.id) {
            <m-session-card [session]="session" (onLoggingOutFromSession)="security.logoutSession($event)" />
          }
        </div>
        <m-button type="button" variant="destructive" size="md" (click)="security.logoutAll()">Esci da tutte le sessioni</m-button>
      </section>
      @if (!account.isSso()) {
        <section>
          <h3 class="font-bold text-lg">Autenticazione a più fattori</h3>
          <span>{{ security.enabledMfa() ? 'Attiva' : 'Non attiva' }}</span>
          @if (!security.enabledMfa()) {
            <m-button type="button" variant="secondary" size="md" (click)="enableMfa()">Attiva l'autenticazione a più fattori</m-button>
          } @else {
            <button type="button" class="underline" (click)="configureMfa()">Configura metodi</button>
            @for (strategy of security.strategies(); track strategy) {
              <m-mfa-strategy-card [activeStrategies]="security.strategies()" [strategy]="strategy" />
            }
          }
        </section>
      }
    </div>
  `,
})
export class SettingsSecurityPanelComponent implements OnInit {
  readonly account = inject(SettingsAccountFacade)
  readonly security = inject(SettingsSecurityFacade)
  private readonly actions = inject(ActionOverlayContextService)

  ngOnInit(): void { this.security.load() }
  changePassword(): void { queueMicrotask(() => this.actions.open('SensitiveDataChange', { innerScope: 'ChangePassword' })) }
  enableMfa(): void { queueMicrotask(() => this.actions.open('SensitiveDataChange', { innerScope: 'EnableMfa' })) }
  configureMfa(): void { queueMicrotask(() => this.actions.open('SensitiveDataChange', { innerScope: 'ConfigMfa' })) }
}
