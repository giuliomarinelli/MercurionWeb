import { Injectable, signal } from '@angular/core';
/** Both desktop states remain mounted; open means expanded. */
@Injectable({ providedIn: 'root' })
export class SidenavContextService {
  private readonly expanded = signal(true);
  readonly isOpen = this.expanded.asReadonly();
  readonly isMounted = signal(true).asReadonly();
  readonly isVisible = signal(true).asReadonly();
  open(): void { this.expanded.set(true); }
  close(): void { this.expanded.set(false); }
  toggle(): void { this.expanded.update(value => !value); }
}
