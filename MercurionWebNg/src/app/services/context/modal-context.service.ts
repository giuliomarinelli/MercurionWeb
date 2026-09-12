import { Injectable, signal } from '@angular/core';
import { CdkPortalOutlet } from '@angular/cdk/portal';

export type ModalOptions = {
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
};

@Injectable({ providedIn: 'root' })
export class ModalContextService {
  private readonly mounted = signal(false);
  private readonly visible = signal(false);
  private readonly opened = signal(false);
  private opts: ModalOptions = { closeOnOverlay: true, closeOnEsc: true };

  registerOutlet(_: CdkPortalOutlet): void {
    this.mounted.set(true);
    this.visible.set(true);
    this.opened.set(true);
  }

  isMounted(): boolean {
    return this.mounted();
  }

  isVisible(): boolean {
    return this.visible();
  }

  isOpened(): boolean {
    return this.opened();
  }

  options(): ModalOptions {
    return this.opts;
  }

  close(): void {
    this.visible.set(false);
    this.opened.set(false);
  }
}
