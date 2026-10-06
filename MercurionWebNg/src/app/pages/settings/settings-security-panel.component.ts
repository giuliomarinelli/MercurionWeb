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
  styleUrl: './settings-panel.styles.css',
  imports: [ButtonComponent, MfaStrategyCardComponent, SessionCardComponent],
  template: `
    <div class="settings-panel-content settings-security">
      @if (!account.isSso()) {
        <h3 class="settings-subheading">Password</h3>
        <div class="flex sm:items-center flex-col gap-4 sm:gap-8 sm:flex-row">
          <div class="flex items-center gap-1" aria-label="Password impostata">
            @for (x of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]; track x) {
              <span>●</span>
            }
          </div>
          <m-button type="button" variant="outline" size="md" (click)="changePassword()">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-6 w-6 relative">
              <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
              <path
                d="M256 240C256 160.5 320.5 96 400 96C479.5 96 544 160.5 544 240C544 319.5 479.5 384 400 384C388.9 384 378 382.7 367.6 380.4L359 378.4L352.7 384.7L321.3 416.1L255.9 416.1L255.9 480.1L191.9 480.1L191.9 544.1L95.9 544.1L95.9 462.7L258.7 299.9L265.6 293L262.7 283.7C258.3 269.9 256 255.3 256 240zM400 64C302.8 64 224 142.8 224 240C224 255.1 225.9 269.8 229.5 283.9L68.7 444.7L64 449.4L64 576L224 576L224 512L288 512L288 448L334.6 448L339.3 443.3L369.3 413.3C379.3 415.1 389.5 416 400 416C497.2 416 576 337.2 576 240C576 142.8 497.2 64 400 64zM432 232C445.3 232 456 221.3 456 208C456 194.7 445.3 184 432 184C418.7 184 408 194.7 408 208C408 221.3 418.7 232 432 232z"
              />
            </svg>
            <p class="mr-2">Cambia password</p>
          </m-button>
        </div>
      }
      <h3 class="settings-subheading">Sessioni attive</h3><p class="settings-help">Controlla gli accessi al tuo account e termina le sessioni che non riconosci.</p>
      <div class="flex flex-col gap-y-4 mb-3">
        @for (s of security.sessions(); track s.id) {
          <m-session-card [session]="s" (onLoggingOutFromSession)="security.logoutSession($event)" />
        }
      </div>
      <m-button type="button" variant="destructive" size="md" (click)="security.logoutAll()">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-6 w-6">
          <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
          <path
            d="M240.1 128L256.1 128L256.1 96L64.1 96L64.1 544L256.1 544L256.1 512L96.1 512L96.1 128L240.1 128zM571.4 331.3L582.7 320L571.4 308.7L427.4 164.7L416.1 153.4L393.5 176L404.8 187.3L521.5 304L224.1 304L224.1 336L521.5 336L404.8 452.7L393.5 464L416.1 486.6L427.4 475.3L571.4 331.3z"
          />
        </svg>
        <span>Esci da tutte le sessioni</span>
      </m-button>
      @if (!account.isSso()) {
        <hr class="border-[0.5px] border-slate-400 dark:border-slate-500 mt-6" />
        <h3 class="settings-subheading settings-subheading-row">
          <span>Autenticazione a più fattori</span>
          <span
            class="inline-flex items-center rounded px-2 py-0.5 text-sm font-semibold cursor-default"
            [class.bg-emerald-200]="security.enabledMfa()"
            [class.text-emerald-800]="security.enabledMfa()"
            [class.dark:bg-amber-200]="!security.enabledMfa()"
            [class.dark:text-amber-800]="!security.enabledMfa()"
            [class.bg-amber-800]="!security.enabledMfa()"
            [class.text-amber-200]="!security.enabledMfa()"
          >
            {{ security.enabledMfa() ? 'Attiva' : 'Non attiva' }}
          </span>
        </h3>
        <div class="flex gap-8 items-center">
          @if (!security.enabledMfa()) {
            <m-button type="button" variant="secondary" size="md" (click)="enableMfa()">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current h-6 w-6 relative">
                <!--!Font Awesome Pro v7.1.0 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2025 Fonticons, Inc.-->
                <path
                  d="M432.2 432L398.5 432L377.2 368L263.3 368L242 432L208.3 432L240.3 336L400.3 336L432.3 432zM320.2 304C284.9 304 256.2 275.3 256.2 240C256.2 204.7 284.9 176 320.2 176C355.5 176 384.2 204.7 384.2 240C384.2 275.3 355.5 304 320.2 304zM320.2 208C302.5 208 288.2 222.3 288.2 240C288.2 257.7 302.5 272 320.2 272C337.9 272 352.2 257.7 352.2 240C352.2 222.3 337.9 208 320.2 208zM320.2 576L307.5 570.5C156.3 505.1 71.4 337.8 80.7 177L81.9 156.5L320.2 64L558.5 156.5L559.6 177C569 337.8 484 505.1 332.9 570.5L320.2 576zM112.7 178.9C105.9 326.2 180.4 480.6 320.2 541.1C460 480.6 534.5 326.2 527.7 178.9L320.2 98.3L112.7 178.9z"
                />
              </svg>
              <p class="mr-2">Attiva l'autenticazione a più fattori</p>
            </m-button>
          }
        </div>
        @if (security.enabledMfa()) {
          <h4 class="settings-method-heading">
            <span>Strategie attive</span>
            <button type="button" (click)="configureMfa()" class="settings-action" aria-label="Configura metodi di autenticazione" title="Configura metodi di autenticazione">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" focusable="false" aria-hidden="true" class="fill-current size-5"><!--!Font Awesome Pro v7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path d="M576.1 223.4C576.2 226.3 576.3 229.1 576.3 232C576.3 324.8 501.1 400 408.3 400C388.5 400 369.5 396.6 351.8 390.3C43.8 698.3 168.8 573.3 128.3 613.8L117 602.5L37.8 523.3L26.5 512C29.3 509.2 46.3 492.2 77.4 461.1L250 288.5C243.7 270.8 240.3 251.8 240.3 232C240.3 139.2 315.5 64 408.3 64C436.5 64 463 70.9 486.4 83.2L487.3 83.7C493.3 86.9 499.1 90.5 504.6 94.3L490.2 108.7L400.3 198.6L400.3 240L441.7 240L531.6 150.1L546 135.7C549.9 141.2 553.4 147 556.6 153L557.1 153.9C568.1 174.8 574.8 198.4 576.1 223.3zM272.3 232C272.3 251.2 276.3 269.5 283.4 286L287.7 296L280 303.7L99.9 483.7L71.6 512L128.2 568.6L156.5 540.3L336.6 360.2L344.3 352.5L354.3 356.8C370.8 364 389.1 367.9 408.3 367.9C483.4 367.9 544.3 307 544.3 231.9C544.3 217 541.9 202.7 537.5 189.3L459.6 267.2L454.9 271.9L368.3 271.9L368.3 185.3L373 180.6L450.9 102.7C437.5 98.3 423.2 95.9 408.3 95.9C333.2 95.9 272.3 156.8 272.3 231.9z"/></svg>
              <span class="hidden 2xs:inline">Configura metodi</span>
            </button>
          </h4>
          <div class="flex flex-col gap-y-3">
            @for (s of security.strategies(); track s) {
              <m-mfa-strategy-card [activeStrategies]="security.strategies()" [strategy]="s" />
            }
          </div>
        }
      }
    </div>
  `,
})
export class SettingsSecurityPanelComponent implements OnInit {
  readonly account = inject(SettingsAccountFacade)
  readonly security = inject(SettingsSecurityFacade)
  private readonly actions = inject(ActionOverlayContextService)

  ngOnInit(): void {
    this.security.load()
  }
  changePassword(): void {
    queueMicrotask(() => this.actions.open('SensitiveDataChange', { innerScope: 'ChangePassword' }))
  }
  enableMfa(): void {
    queueMicrotask(() => this.actions.open('SensitiveDataChange', { innerScope: 'EnableMfa' }))
  }
  configureMfa(): void {
    queueMicrotask(() => this.actions.open('SensitiveDataChange', { innerScope: 'ConfigMfa' }))
  }
}
