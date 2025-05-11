import { effect, Injectable, signal } from "@angular/core";

@Injectable({ providedIn: 'root' })
export class SidenavContextService {
  /** stato logico */
  private readonly _open = signal(true);

  /** derivati per la view */
  readonly isMounted = signal(true);
  readonly isVisible = signal(true);

  constructor() {
    effect(() => {
      if (this._open()) {
        this.isMounted.set(true);
        setTimeout(() => this.isVisible.set(true))
      } else {
        this.isVisible.set(false);
        setTimeout(() => this.isMounted.set(false), 200)
      }
    });
  }

  /** API pubblico */
  readonly isOpen = this._open.asReadonly()
  open() {
    this._open.set(true)

  }
  close() {
    this._open.set(false)

  }
  toggle() {
    this._open.update((v: boolean) => !v)
    console.log(this._open)
  }
}
