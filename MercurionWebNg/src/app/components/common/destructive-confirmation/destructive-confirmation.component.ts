import { A11yModule } from '@angular/cdk/a11y'
import { CdkPortal, DomPortalOutlet } from '@angular/cdk/portal'
import { DOCUMENT } from '@angular/common'
import { ChangeDetectionStrategy, Component, effect, inject, input, output, untracked, viewChild } from '@angular/core'
import { ButtonComponent } from '../button/button.component'
import { DialogShellComponent } from '../dialog-shell/dialog-shell.component'

let nextConfirmationId = 0

@Component({
  selector: 'm-destructive-confirmation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [A11yModule, CdkPortal, ButtonComponent, DialogShellComponent],
  template: `
    <ng-template cdkPortal>
    <m-dialog-shell [mounted]="open()" [open]="open()" [labelledBy]="titleId" [describedBy]="descriptionId"
      [dismissalPolicy]="{ escape: !pending(), backdrop: !pending() }" (dismissed)="cancel()">
      <section class="flex min-w-0 flex-col gap-4 p-2 text-on-surface-main" [attr.aria-busy]="pending()">
        <h2 [id]="titleId" class="text-xl font-semibold">{{ title() }}</h2>
        @if (subject()) { <p class="font-semibold wrap-anywhere">{{ subject() }}</p> }
        <p [id]="descriptionId">{{ description() }}</p>
        @if (error()) { <p role="alert" class="text-light-error dark:text-dark-error">{{ error() }}</p> }
        <div class="flex flex-wrap justify-end gap-3">
          <button type="button" cdkFocusInitial class="min-h-12 rounded-lg border border-token-border px-4 font-semibold focus-visible:outline-2"
            [disabled]="pending()" (click)="cancel()">Annulla</button>
          <m-button variant="destructive" size="lg" [disabled]="pending()" [loading]="pending()"
            (pressed)="confirm()">{{ confirmLabel() }}</m-button>
        </div>
      </section>
    </m-dialog-shell>
    </ng-template>
  `
})
export class DestructiveConfirmationComponent {
  private readonly document = inject(DOCUMENT)
  private readonly portal = viewChild(CdkPortal)
  readonly titleId = `destructive-title-${++nextConfirmationId}`
  readonly descriptionId = `${this.titleId}-description`
  readonly open = input(false)
  readonly title = input.required<string>()
  readonly subject = input('')
  readonly description = input.required<string>()
  readonly confirmLabel = input('Elimina definitivamente')
  readonly pending = input(false)
  readonly error = input('')
  readonly cancelled = output<void>()
  readonly confirmed = output<void>()

  constructor() {
    effect(onCleanup => {
      const portal = this.portal()
      if (!this.open() || !portal) return
      untracked(() => {
        // A sidebar or card can create a stacking context that clips a fixed dialog.
        const host = this.document.createElement('div')
        host.setAttribute('data-destructive-dialog-outlet', '')
        this.document.body.appendChild(host)
        const outlet = new DomPortalOutlet(host)
        outlet.attach(portal)
        onCleanup(() => {
          outlet.dispose()
          host.remove()
        })
      })
    })
  }

  cancel(): void { if (!this.pending()) this.cancelled.emit() }
  confirm(): void { if (!this.pending()) this.confirmed.emit() }
}
