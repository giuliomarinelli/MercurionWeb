// modal.component.ts
import { Component, HostListener, inject } from '@angular/core';
import { PortalModule, CdkPortalOutlet } from '@angular/cdk/portal';
import { ViewChild } from '@angular/core';
import { ModalContextService } from '../../../services/context/modal-context.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [PortalModule],
  template: `
  @if (ctx.isMounted()) {
    <div class="fixed inset-0 z-[999] bg-black/60 backdrop-blur-sm transition-all duration-300"
         [class.opacity-0]="!ctx.isVisible()" [class.opacity-100]="ctx.isVisible()"
         role="dialog" aria-modal="true" (click)="overlayClick($event)">
      <div class="min-h-full flex items-center justify-center p-4">
        <div class="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden"
             (click)="$event.stopPropagation()">
          <ng-template cdkPortalOutlet></ng-template>
        </div>
      </div>
    </div>
  }`
})
export class ModalComponent {

  protected readonly ctx = inject(ModalContextService);

  private _outlet?: CdkPortalOutlet;

  // 👉 si attiva ogni volta che l’outlet compare (quando @if diventa true)
  @ViewChild(CdkPortalOutlet)
  set outlet(o: CdkPortalOutlet | undefined) {
    if (o && o !== this._outlet) {
      this._outlet = o;
      this.ctx.registerOutlet(o);
    }
  }

  overlayClick(_: MouseEvent) {
    if (this.ctx.options().closeOnOverlay) this.ctx.close();
  }

  @HostListener('document:keydown.escape')
  onEsc() { if (this.ctx.isOpened() && this.ctx.options().closeOnEsc) this.ctx.close(); }
}
