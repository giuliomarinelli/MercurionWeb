import { Injectable } from '@angular/core';
import { CdkPortalOutlet } from '@angular/cdk/portal';

export type ModalOptions = {
  closeOnOverlay?: boolean;
  closeOnEsc?: boolean;
};

@Injectable({ providedIn: 'root' })
export class ModalContextService {
  private mounted = false;
  private visible = false;
  private opened = false;
  private opts: ModalOptions = { closeOnOverlay: true, closeOnEsc: true };

  registerOutlet(_: CdkPortalOutlet): void {
    this.mounted = true;
    this.visible = true;
    this.opened = true;
  }

  isMounted(): boolean {
    return this.mounted;
  }

  isVisible(): boolean {
    return this.visible;
  }

  isOpened(): boolean {
    return this.opened;
  }

  options(): ModalOptions {
    return this.opts;
  }

  close(): void {
    this.visible = false;
    this.opened = false;
  }
}
