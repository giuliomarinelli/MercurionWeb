import { ChangeDetectionStrategy, Component, inject } from '@angular/core'
import { ActionOverlayContextService } from '../../services/context/action-context/action-overlay-context.service'
import { SettingsAccountFacade } from './settings-account.facade'

@Component({
  selector: 'm-settings-contact-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './settings-panel.styles.css',
  template: `
    @if (account.profile(); as profile) {
      <div class="settings-panel-content">
        <div class="settings-data-row">
          <div class="settings-data-label">
            @if (profile.accountIdKind === 'email') {
              E-mail
            } @else {
              ORCID
            }
          </div>
          <div class="settings-contact-value">
            <strong class="settings-value">{{ profile.obscuredAccountId }}</strong>
            @if (!account.isSso()) {
              <button type="button" class="settings-action" aria-label="Modifica indirizzo e-mail" title="Modifica indirizzo e-mail" (click)="changeEmail()">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-6" aria-hidden="true" focusable="false"><!--!Font Awesome Pro v7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path d="M192 448C194.3 435.6 202.3 392.9 216 320L465.4 70.6L488 48C497.1 57.1 524.2 84.2 569.4 129.4L592 152L569.4 174.6L320 424C247.1 437.7 204.4 445.7 192 448zM304.4 394.4L474.1 224.7L415.4 166L245.7 335.7L232.1 408L304.4 394.4zM496.7 202.1L546.8 152L488.1 93.3L438 143.4L496.7 202.1zM64 128L288 128L288 160L96 160L96 544L480 544L480 352L512 352L512 576L64 576L64 128z"/></svg>
                <span class="hidden lg:inline">Modifica</span>
              </button>
            }
          </div>
        </div>
        @if (!account.isSso()) {
          <div class="settings-data-row">
            <div class="settings-data-label">Numero di telefono</div>
            <div class="settings-contact-value">
              <strong class="settings-value">{{ profile.obscuredPhone ?? 'Non aggiunto' }}</strong>
              @if (profile.obscuredPhone) {
                <div class="settings-contact-actions">
                  <button type="button" class="settings-action" aria-label="Modifica numero di telefono" title="Modifica numero di telefono" (click)="changePhone()">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" class="fill-current size-6" aria-hidden="true" focusable="false"><!--!Font Awesome Pro v7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path d="M192 448C194.3 435.6 202.3 392.9 216 320L465.4 70.6L488 48C497.1 57.1 524.2 84.2 569.4 129.4L592 152L569.4 174.6L320 424C247.1 437.7 204.4 445.7 192 448zM304.4 394.4L474.1 224.7L415.4 166L245.7 335.7L232.1 408L304.4 394.4zM496.7 202.1L546.8 152L488.1 93.3L438 143.4L496.7 202.1zM64 128L288 128L288 160L96 160L96 544L480 544L480 352L512 352L512 576L64 576L64 128z"/></svg>
                    <span class="hidden lg:inline">Modifica</span>
                  </button>
                  <button type="button" class="settings-action settings-action--destructive" aria-label="Rimuovi numero di telefono" title="Rimuovi numero di telefono" (click)="deletePhone()">
                    <svg class="size-6 text-light-error dark:text-dark-error" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fill-rule="evenodd" d="M6 8a1 1 0 0 1 1 1v7h6V9a1 1 0 1 1 2 0v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V9a1 1 0 0 1 1-1zM4 5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v1H4V5z" clip-rule="evenodd" />
                    </svg>
                    <span class="hidden lg:inline">Elimina numero di telefono</span>
                  </button>
                </div>
              } @else {
                <button type="button" class="settings-action" aria-label="Aggiungi numero di telefono" title="Aggiungi numero di telefono" (click)="addPhone()">
                  <svg xmlns="http://www.w3.org/2000/svg" class="fill-current size-6" viewBox="0 0 640 640" focusable="false" aria-hidden="true"><!--!Font Awesome Pro v7.3.1 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2026 Fonticons, Inc.--><path d="M416 368L480 576L446.5 576L392.3 400L119.6 400L65.4 576L31.9 576L95.9 368L415.9 368zM544 152L544 224L616 224L616 256L544 256L544 328L512 328L512 256L440 256L440 224L512 224L512 152L544 152zM256 320C185.3 320 128 262.7 128 192C128 121.3 185.3 64 256 64C326.7 64 384 121.3 384 192C384 262.7 326.7 320 256 320zM256 96C203 96 160 139 160 192C160 245 203 288 256 288C309 288 352 245 352 192C352 139 309 96 256 96z"/></svg>
                  <span class="hidden lg:inline">Aggiungi</span>
                </button>
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
