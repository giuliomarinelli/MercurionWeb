// modal.component.ts
import { Component, ChangeDetectionStrategy, effect, inject, viewChild } from '@angular/core';
import { PortalModule, CdkPortalOutlet } from '@angular/cdk/portal';
import { ModalContextService } from '../../../services/context/modal-context.service';
import { DialogShellComponent } from '../dialog-shell/dialog-shell.component';

@Component({
  selector: 'm-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PortalModule, DialogShellComponent],
  template: `
    <m-dialog-shell
      [mounted]="ctx.isMounted()"
      [open]="ctx.isVisible()"
      label="Dialog"
      backdropClass="bg-black/60"
      (dismissed)="close($event)">
      <ng-template cdkPortalOutlet></ng-template>
    </m-dialog-shell>`
})
export class ModalComponent {

  protected readonly ctx = inject(ModalContextService);

  private _outlet?: CdkPortalOutlet;

  // Si aggiorna ogni volta che l’outlet compare (quando @if diventa true).
  readonly outlet = viewChild(CdkPortalOutlet)

  constructor() {
    effect(() => {
      const outlet = this.outlet()
      if (outlet && outlet !== this._outlet) {
        this._outlet = outlet
        this.ctx.registerOutlet(outlet)
      }
    })
  }

  close(reason: 'escape' | 'backdrop'): void {
    const options = this.ctx.options();
    if ((reason === 'escape' && options.closeOnEsc) ||
        (reason === 'backdrop' && options.closeOnOverlay)) {
      this.ctx.close();
    }
  }
}
